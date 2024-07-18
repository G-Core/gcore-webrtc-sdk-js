import { types as ms } from "mediasoup-client";

import type { MsTransport } from "../msTypes.js";
import { PeerId, MediaLabel, RtcMediaLabel, RtcTransportDirection } from "../types.js";

export enum PeerStreamEvents {
  Create = "create",
  Close = "close",
  Toggle = "toggle",
}

/**
 * @internal
 */
export interface RtcRecvTransportConnectorT {
  on(e: PeerStreamEvents, h: () => void): void;
  off(e: PeerStreamEvents, h: () => void): void;
  close(): void;
}

/**
 * @internal
 */
export enum RtcSendTransportEvents {
  Create = "create",
}

export type ConsumerAppData = {
  label: MediaLabel;
  peerId: string;
  producerPaused: boolean;
  routerId: string;
  transportId: string;
};

export type DataConsumerAppData = {
  peerId: string;
  transportId?: string;
};

export type DataProducerAppData = Record<string, never>;

export type ProducerAppData = {
  label: string;
};

/**
 * @internal
 */
export enum RtcTransportConnectorEvents {
  Created = "created",
  Failure = "failure",
  IceFailure = "iceFailure",
  Ready = "ready",
}

export type TransportAppData = {
  routerId?: string;
};

/**
 * @internal
 */
export interface RtcTransportConnectorT {
  dir: RtcTransportDirection;
  ready: boolean;

  on(
    event: RtcTransportConnectorEvents.Created,
    cb: (t: MsTransport) => void
  ): void;
  on(
    event: RtcTransportConnectorEvents.Failure,
    cb: (error: Error) => void
  ): void;
  on(
    event: RtcTransportConnectorEvents.IceFailure,
    cb: (error: Error) => void
  ): void;
  on(event: RtcTransportConnectorEvents.Ready, cb: () => void): void;

  addRouter(device: ms.Device, routerId: string): void;
  close(): void;
  getObject(transportId?: string): Promise<MsTransport>;
  reset(): void;
  setIceServers(servers: RTCIceServer[], iceTransportPolicy?: "all" | "relay"): void;
  start(): void;
}

export interface RtcPeerStreamsControllerT {
  getMediaTrack(label: MediaLabel, peerId: PeerId): MediaStreamTrack | undefined;
  requestKeyFrame(label: MediaLabel, peerId: PeerId): void;
  setPreferredLayers(label: MediaLabel, peerId: PeerId, spatialLayer: number, temporalLayer: number): void;
  setPriority(label: MediaLabel, peerId: PeerId, priority: number): void;
}

export type RtcTransportRestartControlOptions = {
  eagerStart?: boolean;
  remoteWaitTimeout?: number;
  restartOnFail?: boolean;
  restartDelay?: number;
  restartMax?: number;
  restartMaxInitial?: number;
};
