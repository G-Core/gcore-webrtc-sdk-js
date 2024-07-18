import { EventEmitter } from "eventemitter3";
import { Device, types as ms } from "mediasoup-client";

import type {
  MessageDto as M,
  RtcDataConsumerCreatedPayload,
  RtcPermissionsPayload,
} from "./msg/types.js";
import type { SignalConnection } from "./signaling/types.js";
import {
  DataMediaLabel,
  type EndpointCaps,
  MediaLabel,
  RtcClientEvents,
  type RtcEndpointOptions,
  type RtcPermissions,
  RtcMediaLabel, RtcMediaPermissionState,
  RtcOutgoingStreamEvents,
  RtcOutgoingStreamOptions,
  type RtcOutgoingStreamT,
  type RtcPeerStreamAvailableData,
  type RtcPeerStreamUnavailableData,
  RtcTransportDirection as Dir,
} from "./types.js";
import { MessageType as MT } from "./msg/types.js";
import { RtcOutgoingStream } from "./RtcOutgoingStream.js";
import { CantStreamMediaException } from "./errors/CantStreamMediaException.js";
import { NotReadyForStreamingException } from "./errors/NotReadyForStreamingException.js";
import type { MsConsumer } from "./msTypes.js";
import { RtcDataChannelConnector } from "./internal/RtcDataChannelConnector.js";
import { RtcDataChannel } from "./RtcDataChannel.js";
import { RtcRequestTestConsumerMessage } from "./msg/RtcTestConsumerRequestMessage.js";

import { RtcPeerStreamsController } from "./internal/RtcPeerStreamsController.js";
import { RtcSendTransportConnector } from "./internal/RtcSendTransportConnector.js";
import {
  PeerStreamEvents,
  RtcPeerStreamsControllerT,
  type RtcTransportRestartControlOptions,
} from "./internal/types.js";
import { RtcTransportConnector } from "./internal/RtcTransportConnector.js";
import { RtcTransportMultiConnector } from "./internal/RtcTransportMultiConnector.js";
import { RtcTransportConnectorEvents, RtcTransportConnectorT } from "./internal/types.js";
import { RtcRouterConnector, RtcRouterConnectorEvents } from "./internal/RtcRouterConnector.js";
import {
  DataConsumerCreateFailedError,
  RequestTestStreamFailedError,
  EventHandlerCrashedError
} from "./errors.js";

import { reportError, trace } from "./trace/index.js";

const TRACE = "lib.rtckit.RtcClient";

export interface RtcClientT {
  readonly peers: RtcPeerStreamsControllerT;
  close(): void;
  getMediaPermission(label: MediaLabel): RtcMediaPermissionState;
  getPeerMediaTrack(label: MediaLabel, peerId: string): MediaStreamTrack | undefined;

  on(event: RtcClientEvents.ConsumingReady, h: () => void): void;
  on(event: RtcClientEvents.ProducingReady, h: () => void): void;
  on(event: RtcClientEvents.EndpointCaps, h: (date: EndpointCaps) => void): void;
  on(event: RtcClientEvents.Failure, h: (e: Error) => void): void;
  on(event: RtcClientEvents.PermissionsChange, h: () => void): void;
  on(event: RtcClientEvents.PeerStreamAvailable, h: (data: RtcPeerStreamAvailableData) => void): void;
  on(event: RtcClientEvents.PeerStreamUnavailable, h: (data: RtcPeerStreamUnavailableData) => void): void;
  on(event: RtcClientEvents.Ready, h: () => void): void;

  off(event: RtcClientEvents.ConsumingReady, h: () => void): void;
  off(event: RtcClientEvents.ProducingReady, h: () => void): void;
  off(event: RtcClientEvents.EndpointCaps, h: (date: EndpointCaps) => void): void;
  off(event: RtcClientEvents.Failure, h: (e: Error) => void): void;
  off(event: RtcClientEvents.PermissionsChange, h: () => void): void;
  off(event: RtcClientEvents.PeerStreamAvailable, h: (data: RtcPeerStreamAvailableData) => void): void;
  off(event: RtcClientEvents.PeerStreamUnavailable, h: (data: RtcPeerStreamUnavailableData) => void): void;
  off(event: RtcClientEvents.Ready, h: () => void): void;

  openDataChannel(label: DataMediaLabel): RtcDataChannel;
  requestTestStream(label: MediaLabel): void;
  sendStream(label: MediaLabel, track: MediaStreamTrack, options?: RtcOutgoingStreamOptions): Promise<RtcOutgoingStreamT>;
  setEndpointOptions(options: RtcEndpointOptions): void;
  setIceServers(iceServers: RTCIceServer[], iceTransportPolicy?: "all" | "relay"): void;
}

export class RtcClient implements RtcClientT {
  private canProduce: Record<ms.MediaKind, boolean> = {
    audio: false,
    video: false,
  };

  private closed = false;

  private emitter = new EventEmitter<RtcClientEvents>();

  off = this.emitter.off.bind(this.emitter);
  on = this.emitter.on.bind(this.emitter);

  private dataChannels: Map<string, RtcDataChannelConnector> = new Map();

  private permsReceived = false;

  private hasAnyMediaPermission = false;

  private peerStreams: RtcPeerStreamsController;

  private send: RtcSendTransportConnector;

  private permissions: {
    available: RtcPermissions;
    current: RtcPermissions;
  } = {
      available: {},
      current: {},
    };

  private streams: Record<string, RtcOutgoingStreamT> = {};

  private readyToConsume = false;

  private readyToProduce = false;

  private routerConnector: RtcRouterConnector;

  private recvConnector: RtcTransportConnectorT;

  private sendConnector: RtcTransportConnectorT;

  // TODO willSend
  constructor(private conn: SignalConnection, transportOptions?: RtcTransportRestartControlOptions) {
    this.conn.subscribe(this.handleMessage.bind(this));
    this.routerConnector = new RtcRouterConnector(conn);
    this.recvConnector = new RtcTransportMultiConnector(conn, Dir.Recv, {
      eagerStart: true,
      restartOnFail: true,
      ...transportOptions,
    });
    this.sendConnector = new RtcTransportConnector(conn, Dir.Send, {
      eagerStart: false,
      ...transportOptions,
    });
    this.peerStreams = new RtcPeerStreamsController(conn, this.recvConnector);
    this.send = new RtcSendTransportConnector(conn, this.sendConnector);

    this.recvConnector.on(RtcTransportConnectorEvents.Ready, () => this.setReadyToConsume());
    this.sendConnector.on(RtcTransportConnectorEvents.Ready, () => this.setReadyToProduce());

    this.peerStreams.on(PeerStreamEvents.Create, (c) => this.onPeerStreamCreate(c));
    this.peerStreams.on(PeerStreamEvents.Close, (c) => this.onPeerStreamClose(c));
    this.peerStreams.on(PeerStreamEvents.Toggle, (c) => this.onPeerStreamToggle(c));
    this.routerConnector.on(RtcRouterConnectorEvents.DeviceReady,
      ({ device, primary, routerId }) => this.onDeviceReady(device, primary, routerId)
    );
    this.recvConnector.on(RtcTransportConnectorEvents.Failure, (e) => this.reportFailure(e));
    this.sendConnector.on(RtcTransportConnectorEvents.Failure, (e) => this.reportFailure(e));
    this.routerConnector.on(RtcRouterConnectorEvents.Failure, (e) => this.reportFailure(e));
  }

  get peers(): RtcPeerStreamsControllerT {
    return this.peerStreams;
  }

  requestTestStream(label: MediaLabel) {
    // TODO don't use getObject
    this.recvConnector.getObject().then(t => {
      this.conn.dispatch(new RtcRequestTestConsumerMessage(label, t.id).pack());
    }).catch(e => reportError(new RequestTestStreamFailedError(e, { label })));
  }

  setEndpointOptions(options: RtcEndpointOptions): void {
    // TODO test
    this.routerConnector.setEndpointOptions(options);
  }

  setIceServers(iceServers: RTCIceServer[], iceTransportPolicy?: "all" | "relay") {
    this.recvConnector.setIceServers(iceServers, iceTransportPolicy);
    this.sendConnector.setIceServers(iceServers, iceTransportPolicy);
  }

  /**
   * Send streaming content to server
   * @param label  Media content label
   * @param track
   * @param options
   * @returns
   */
  async sendStream(label: MediaLabel, track: MediaStreamTrack, options?: RtcOutgoingStreamOptions): Promise<RtcOutgoingStreamT> {
    trace(`${TRACE}.sendStream`, {label});
    if (!this.readyToProduce) {
      throw new NotReadyForStreamingException();
    }
    const kind = track.kind as ms.MediaKind;
    if (!this.canProduce[kind]) {
      throw new CantStreamMediaException(kind); // TODO rename
    }
    const s = this.streams[label];
    if (s) {
      s.setMediaTrack(track);
      return s;
    }
    const producer = await this.send.produce(label, track, options);
    const newStream = new RtcOutgoingStream(
      this.conn,
      producer,
    );
    // TODO test
    newStream.on(RtcOutgoingStreamEvents.Close, () => {
      delete this.streams[label];
    });
    this.streams[label] = newStream;
    return newStream;
  }

  close() {
    if (this.closed) {
      trace(`${TRACE}.close.alreadyClosed`);
      return;
    }

    Object.values(this.streams).forEach(s => s.close());
    this.streams = {};

    this.dataChannels.forEach(dc => dc.close());
    this.dataChannels.clear();

    this.recvConnector.close();
    this.sendConnector.close();
    this.routerConnector.close();

    this.closed = true;

    this.emitter.removeAllListeners();
  }

  /**
   * @deprecated Use {@link RtcPeerStreamsController.getMediaTrack RtcClient.peers.getMediaTrack} instead
   * @param label
   * @param peerId
   * @returns
   */
  getPeerMediaTrack(label: MediaLabel, peerId: string): MediaStreamTrack | undefined {
    return this.peerStreams.getMediaTrack(label, peerId);
  }

  getMediaPermission(label: string): RtcMediaPermissionState {
    if (!this.permissionsReceived) {
      return RtcMediaPermissionState.Unavailable;
    }
    const l = this.getRealMediaLabel(label);
    if (!this.permissions.available[l]) {
      return RtcMediaPermissionState.Unavailable;
    }
    return this.permissions.current[l] ? RtcMediaPermissionState.Enabled : RtcMediaPermissionState.Disabled;
  }

  // TODO test
  // TODO support options
  openDataChannel(label: DataMediaLabel): RtcDataChannel {
    return this.initDataChannel(label).dataChannel;
  }

  private handleMessage(m: M) {
    switch (m.type) {
      case MT.Connected:
        this.onConnected();
        break;
      case MT.RtcPermissions:
        this.onPermissions((m as M<MT.RtcPermissions>).data);
        break;
      case MT.RtcDataConsumerCreated:
        this.onDataConsumerCreated((m as M<MT.RtcDataConsumerCreated>).data);
        break;
    }
  }

  private setReadyToConsume() {
    if (this.readyToConsume) {
      return;
    }
    this.readyToConsume = true;
    this.emitter.emit(RtcClientEvents.ConsumingReady);
    this.checkReady();
  }

  private checkReady() {
    if (this.readyToConsume && (this.readyToProduce || this.permsReceived && !this.hasAnyMediaPermission)) {
      this.emitter.emit(RtcClientEvents.Ready);
    }
  }

  private setReadyToProduce() {
    if (this.readyToProduce) {
      return;
    }
    this.readyToProduce = true;
    this.emitter.emit(RtcClientEvents.ProducingReady);
    this.checkReady();
  }

  private onPeerStreamCreate(consumer: MsConsumer) {
    const {
      appData: { label, peerId, producerPaused },
      paused,
      track
    } = consumer;
    const available = !paused && !producerPaused;
    if (available) {
      try {
        this.emitter.emit(RtcClientEvents.PeerStreamAvailable, {
          label,
          peerId,
          resumed: false,
          track,
        });
      } catch (e) {
        reportError(new EventHandlerCrashedError(e, { eventName: RtcClientEvents.PeerStreamAvailable, label }));
      }
    }
  }

  private onPeerStreamClose(consumer: MsConsumer) {
    const {
      appData: { label, peerId },
    } = consumer;
    try {
      this.emitter.emit(RtcClientEvents.PeerStreamUnavailable, {
        label,
        paused: false,
        peerId,
      });
    } catch (e) {
      reportError(new EventHandlerCrashedError(e, { eventName: RtcClientEvents.PeerStreamUnavailable, label }));
    }
  }

  private onPeerStreamToggle(consumer: MsConsumer) {
    const {
      appData: { label, peerId, producerPaused },
      paused,
      track,
    } = consumer;
    const enabled = !paused && !producerPaused;
    try {
      if (enabled) {
        this.emitter.emit(RtcClientEvents.PeerStreamAvailable, {
          label,
          peerId,
          resumed: true,
          track,
        });
      } else {
        this.emitter.emit(RtcClientEvents.PeerStreamUnavailable, {
          label,
          peerId,
          paused: true,
        });
      }
    } catch (e) {
      const eventName = enabled ? RtcClientEvents.PeerStreamAvailable : RtcClientEvents.PeerStreamUnavailable;
      reportError(new EventHandlerCrashedError(e, { eventName, label }));
    }
  }

  private onDataConsumerCreated(data: RtcDataConsumerCreatedPayload) {
    const { label } = data;
    const dcm = this.initDataChannel(label);
    dcm!.createDataConsumer(data).catch(e => reportError(new DataConsumerCreateFailedError(e, { label })));
  }

  private onConnected() {
    // This happens on the first connect and on a reconnect as well
    // In the latter case, the transports need to be recreated
    // TODO test
    this.readyToProduce = false;
    this.readyToConsume = false;
  }

  private onPermissions({ available, current }: RtcPermissionsPayload) {
    this.permissions = { available, current };
    this.permissionsReceived();
    this.emitter.emit(RtcClientEvents.PermissionsChange);
  }

  private permissionsReceived() {
    trace(`${TRACE}.permissionsReceived`);
    if (this.permsReceived) {
      return;
    }
    this.hasAnyMediaPermission = Object.values(this.permissions.available).some(v => v);
    if (!this.hasAnyMediaPermission) {
      this.sendConnector.close();
    } else {
      this.startSendTransport();
    }
    this.permsReceived = true;
    this.checkReady();
  }

  private initDataChannel(label: DataMediaLabel): RtcDataChannelConnector {
    if (!this.dataChannels.has(label)) {
      this.dataChannels.set(label, this.createDataChannelConnector(label));
    }
    return this.dataChannels.get(label)!;
  }

  private createDataChannelConnector(label: DataMediaLabel, producing = true): RtcDataChannelConnector {
    return new RtcDataChannelConnector(
      label,
      this.conn,
      this.recvConnector,
      this.sendConnector,
      producing
    );
  }

  private getRealMediaLabel(label: string): string {
    const knownLabels = Object.keys(this.permissions.available);
    if (knownLabels.includes(label)) {
      return label;
    }
    if (label.startsWith("data:")) {
      return RtcMediaLabel.Data;
    }
    return "";
  }

  private onDeviceReady(device: Device, primary: boolean, routerId: string) {
    trace(`${TRACE}.onDeviceReady`, { primary, routerId } );
    if (primary) {
      this.sendConnector.addRouter(device, routerId);
      this.canProduce.audio = device.canProduce("audio");
      this.canProduce.video = device.canProduce("video");
      const {
        rtpCapabilities,
        sctpCapabilities,
      } = device;
      this.emitter.emit(RtcClientEvents.EndpointCaps, {
        rtpCapabilities,
        sctpCapabilities,
      });
    }
    this.recvConnector.addRouter(device, routerId);
  }

  private startSendTransport() {
    if (this.hasAnyMediaPermission) {
      this.sendConnector.start();
    }
  }

  private reportFailure(e: Error) {
    reportError(e);
    this.emitter.emit(RtcClientEvents.Failure, e);
  }
}
