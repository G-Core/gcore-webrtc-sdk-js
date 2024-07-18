import { EventEmitter } from "eventemitter3";

import { reportError } from "./trace/index.js";
import {
  ReplaceStreamTrackFailedError,
  PauseRemoteStreamFailedError,
  ResumeRemoteStreamFailedError,
  SyncStreamStateFailedError
} from "./errors.js";
import { type MessageDto as M, MessageType as MT, RtcProducerStatePayload, RtcProducerClosedPayload } from "./msg/types.js";
import type { SignalConnection } from "./signaling/types.js";
import type { MsProducer } from "./msTypes.js";
import { RtcProducerToggleMessage } from "./msg/RtcProducerToggleMessage.js";
import { RtcLoopbackConsumerRequestMessage } from "./msg/RtcLoopbackConsumerRequestMessage.js";
import { RtcProducerCloseMessage } from "./msg/RtcProducerCloseMessage.js";
import {
  RtcOutgoingStreamCloseReason,
  RtcOutgoingStreamEvents,
  type RtcOutgoingStreamT
} from "./types.js";

export class RtcOutgoingStream implements RtcOutgoingStreamT {
  private emitter = new EventEmitter();

  public readonly on = this.emitter.on.bind(this.emitter);

  public readonly off = this.emitter.off.bind(this.emitter);

  constructor(
    private conn: SignalConnection,
    private producer: MsProducer,
  ) {
    this.conn.subscribe((m) => this.handleMessage(m));
    producer.on("transportclose", () => this.onTransportClose());
  }

  get label() {
    return this.producer.appData.label;
  }

  get paused() {
    return this.producer.paused;
  }

  close() {
    if (this.producer.closed) {
      return;
    }
    try {
      this.conn.dispatch(new RtcProducerCloseMessage(this.producer.id).pack());
      this.producer.close();
    } catch (e) {
      // socket not connected, ignore
      reportError(e);
    }
    this.emitter.removeAllListeners();
  }

  pause(): Promise<void> {
    // TODO throw error if closed
    return this.toggleProducer(true).catch((e) => {
      reportError(new PauseRemoteStreamFailedError(e));
    });
  }

  resume(): Promise<void> {
    // TODO throw error if closed
    return this.toggleProducer(false).catch((e) => {
      reportError(new ResumeRemoteStreamFailedError(e));
    });
  }

  async requestLoopback() {
    this.conn.dispatch(
      new RtcLoopbackConsumerRequestMessage(this.producer.id).pack(),
    );
  }

  setMaxSpatialLayer(layer: number): void {
    this.producer.setMaxSpatialLayer(layer);
  }

  setMediaTrack(track: MediaStreamTrack): Promise<void> {
    // TODO throw error if closed
    // TODO replace track - see MeetMediaProducer implementation
    // TODO handle track ended event
    return this.producer.replaceTrack({ track }).catch((e: unknown) => {
      reportError(new ReplaceStreamTrackFailedError(e));
    });
  }

  private toggleProducer(paused: boolean): Promise<void> {
    if (this.producer.paused === paused) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      // TODO don't wait for ack, wait for ProducerStateChange msg
      this.conn.dispatch(new RtcProducerToggleMessage(this.producer.id, paused).pack(), (e: unknown) => {
        if (e) {
          // TODO wrap error
          reject(e);
          return;
        }
        try {
          this.toggleLocal(paused);
        } catch (e) {
          reject(e);
          return;
        }
        resolve();
      });
    });
  }

  private toggleLocal(paused: boolean) {
    if (this.producer.paused === paused) {
      return;
    }
    if (paused) {
      this.producer.pause();
    } else {
      this.producer.resume();
    }
  }

  private handleMessage(m: M) {
    switch (m.type) {
      case MT.RtcProducerState:
        // TODO
        this.onProducerState(m.data as RtcProducerStatePayload)
        break;
      case MT.RtcProducerClosed:
        this.onProducerClosed(m.data as RtcProducerClosedPayload);
        break;
    }
  }

  // TODO test
  private onProducerState({id, paused, reason }: RtcProducerStatePayload) {
    if (id !== this.producer.id) {
      return;
    }
    try {
      this.toggleLocal(paused);
      this.emitter.emit(RtcOutgoingStreamEvents.Toggle, {
        paused,
        reason
      });
    } catch (e) {
      reportError(new SyncStreamStateFailedError(e));
    }
  }

  private onProducerClosed({ id, reason }: RtcProducerClosedPayload) {
    if (id !== this.producer.id) {
      return;
    }
    // TODO don't use reason
    if (reason === "client") {
      return;
    }
    if (this.producer.closed) {
      return;
    }
    this.producer.close();
    // TODO on stream close remove stream from rtcClient
    this.emitter.emit(RtcOutgoingStreamEvents.Close, { reason });
  }

  private onTransportClose() {
    this.emitter.emit(RtcOutgoingStreamEvents.Close, { reason: RtcOutgoingStreamCloseReason.TransportClose });
  }
}
