import { EventEmitter } from "eventemitter3";

import {
  MessageType as MT,
} from "../msg/types.js";
import type {
  MessageDto as M,
  RtcConsumerClosedPayload,
  RtcConsumerCreatedPayload,
  RtcConsumerStatePayload,
} from "../msg/types.js";

import { RtcConsumerKeyFrameRequestMessage } from "../msg/RtcConsumerKeyFrameRequestMessage.js";
import { RtcConsumerLayersSetMessage } from "../msg/RtcConsumerLayersSetMessage.js";
import { RtcConsumerPriorityMessage } from "../msg/RtcConsumerPriorityMessage.js";
import { RtcConsumerToggleMessage } from "../msg/RtcConsumerToggleMessage.js";

import type { SignalConnection } from "../signaling/types.js";

import type { MsConsumer, MsTransport } from "../msTypes.js";
import {
  type ConsumerAppData,
  type RtcRecvTransportConnectorT,
  PeerStreamEvents,
  type RtcTransportConnectorT,
  type RtcPeerStreamsControllerT,
} from "./types.js";
import {
  MediaLabel,
  type PeerId,
} from "../types.js";
import { reportError, trace } from "../trace/index.js";

class ConsumerResumeFailedError extends Error {
  constructor(e: unknown) {
    super(`Consumer resume failed: ${e}`);
  }
}

const TRACE = "lib.rtckit.internal.RtcPeerStreamsController";

type ConsumerId = string;
type RouterId = string;
type ConsumersRecord = Record<MediaLabel, ConsumerId>;

/**
 * Provides access to the remote peers' streams
 */
export class RtcPeerStreamsController implements RtcRecvTransportConnectorT, RtcPeerStreamsControllerT {
  private emitter = new EventEmitter();

  private consumers: Map<ConsumerId, MsConsumer> = new Map();

  private peers: Map<PeerId, ConsumersRecord> = new Map();

  on = this.emitter.on.bind(this.emitter);

  off = this.emitter.off.bind(this.emitter);

  constructor(private conn: SignalConnection, private connector: RtcTransportConnectorT) {
    this.conn.subscribe(this.handleMessage.bind(this));
  }

  close() {
    for (const c of this.consumers.values()) {
      c.close();
    }
    this.consumers.clear();
    this.peers.clear();
  }

  // TODO test
  getMediaTrack(label: MediaLabel, peerId: PeerId): MediaStreamTrack | undefined {
    const consumer = this.findConsumer(label, peerId);
    if (!consumer || consumer.closed || consumer.paused || consumer.appData.producerPaused) {
      return;
    }
    return consumer.track;
  }

  // TODO test
  requestKeyFrame(label: MediaLabel, peerId: PeerId) {
    this.withConsumer(label, peerId, (consumerId, routerId) => {
      this.conn.dispatch(new RtcConsumerKeyFrameRequestMessage(consumerId, routerId).pack());
    });
  }

  // TODO test
  setPreferredLayers(label: MediaLabel, peerId: PeerId, spatialLayer: number, temporalLayer: number): void {
    this.withConsumer(label, peerId, (consumerId, routerId) => {
      this.conn.dispatch(new RtcConsumerLayersSetMessage(consumerId, spatialLayer, temporalLayer, routerId).pack());
    });
  }

  // TODO test
  setPriority(label: MediaLabel, peerId: PeerId, priority: number): void {
    this.withConsumer(label, peerId, (consumerId, routerId) => {
      this.conn.dispatch(new RtcConsumerPriorityMessage(consumerId, priority, routerId).pack());
    });
  }

  private async onConsumerCreated(data: RtcConsumerCreatedPayload) {
    const { appData: { producerPaused, transportId }, id: consumerId } = data;
    if (this.consumers.has(consumerId)) {
      trace(`${TRACE}.onConsumerCreated.alreadyExists`, { consumerId });
      return;
    }
    try {
      const transport = await this.connector.getObject(transportId);
      const consumer = await transport.consume<ConsumerAppData>(data);
      if (producerPaused) {
        consumer.pause();
      }
      this.consumerCreated(consumer, transport);
      this.emitter.emit(PeerStreamEvents.Create, consumer);
    } catch (e) {
      reportError(e as Error);
    }
  }

  protected handleMessage(m: M) {
    switch (m.type) {
      case MT.RtcConsumerClosed:
        this.onConsumerClosed((m as M<MT.RtcConsumerClosed>).data);
        break;
      case MT.RtcConsumerCreated:
        this.onConsumerCreated((m as M<MT.RtcConsumerCreated>).data);
        break;
      case MT.RtcConsumerState:
        this.onConsumerState((m as M<MT.RtcConsumerState>).data);
        break;
    }
  }

  private onConsumerClosed({ id }: RtcConsumerClosedPayload) {
    trace(`${TRACE}.onConsumerClosed`, { consumerId: id })
    this.closeConsumer(id);
  }

  private bindConsumerListeners(consumer: MsConsumer) {
    const {
      appData: {
        label,
        peerId: producingPeerId,
      },
      id: consumerId,
    } = consumer;
    const labels = {
      consumerId,
      producingPeerId,
      label
    };
    consumer.on("trackended", () => {
      trace(`${TRACE}.consumer.trackended`, labels);
      this.closeConsumer(consumer.id);
    });
    consumer.on("transportclose", () => {
      trace(`${TRACE}.consumer.transportclose`, labels);
      this.closeConsumer(consumer.id)
    });
    consumer.track.addEventListener("mute", () => {
      trace(`${TRACE}.consumer.track.mute`, labels)
    });
    consumer.track.addEventListener("unmute", () => {
      trace(`${TRACE}.consumer.track.unmute`, labels)
    });
  }

  private closeConsumer(id: ConsumerId) {
    const consumer = this.consumers.get(id);
    if (!consumer) {
      trace(`${TRACE}.closeConsumer.notFound`, { consumerId: id });
      return;
    }
    const {
      appData: { label, peerId },
    } = consumer;
    this.consumers.delete(consumer.id);
    if (this.peers.has(peerId)) {
      delete this.peers.get(peerId)![label as MediaLabel];
    }
    consumer.close();
    this.emitter.emit(PeerStreamEvents.Close, consumer);
  }

  private consumerCreated(consumer: MsConsumer, transport: MsTransport) {
    const {
      appData: { label, peerId },
    } = consumer;
    const {
      appData: { routerId }
    } = transport;
    this.consumers.set(consumer.id, consumer);
    if (!this.peers.has(peerId)) {
      this.peers.set(peerId, {});
    }
    this.peers.get(peerId)![label] = consumer.id;
    this.bindConsumerListeners(consumer);
    // TODO don't wait for ack
    this.conn.dispatch(new RtcConsumerToggleMessage(consumer.id, true, routerId).pack(), (e) => {
      if (e) {
        reportError(new ConsumerResumeFailedError(e));
      } else {
        this.emitter.emit(PeerStreamEvents.Toggle, consumer);
      }
    });
  }

  private onConsumerState(data: RtcConsumerStatePayload) {
    const { id, paused, producerPaused } = data;
    const consumer = this.consumers.get(id);
    if (!consumer) {
      trace(`${TRACE}.onConsumerState.notFound`, { consumerId: id });
      return;
    }
    const wasPaused = consumer.appData.producerPaused || consumer.paused;
    consumer.appData.producerPaused = producerPaused;
    // TODO test regardless of the current paused state
    if (paused) {
      consumer.pause();
    } else {
      consumer.resume();
    }
    const isPaused = consumer.appData.producerPaused || consumer.paused;
    if (wasPaused !== isPaused) {
      this.emitter.emit(PeerStreamEvents.Toggle, consumer);
    }
  }

  private findConsumer(label: MediaLabel, peerId: PeerId): MsConsumer | undefined {
    const consumerId = this.peers.get(peerId)?.[label];
    if (!consumerId) {
      return;
    }
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      return;
    }
    return consumer;
  }

  private withConsumer(label: MediaLabel, peerId: PeerId, cb: (consumerId: ConsumerId, routerId?: RouterId) => void) {
    const consumer = this.findConsumer(label, peerId);
    if (consumer) {
      const { appData: {routerId}, id: consumerId } = consumer;
      cb(consumerId, routerId);
    } else {
      trace(`${TRACE}.withConsumer.notFound`, { label, peerId });
    }
  }
}
