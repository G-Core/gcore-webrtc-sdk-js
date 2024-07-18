import { types as ms } from "mediasoup-client";
import { RtpHeaderExtension } from "mediasoup-client/lib/RtpParameters.js";

export type ApiClientConfig = {
  host?: string;
  clientHost?: string;
  clientKey?: string
}

export type EndpointCaps = {
  rtpCapabilities: ms.RtpCapabilities;
  sctpCapabilities: ms.SctpCapabilities;
};

export enum PeerIceState {
  None = 0,
  Recv,
  Send,
  SendRecv,
}

export type PeerId = string;

export type DataMediaLabel = string;

export type MediaLabel = string;

export enum RtcMediaLabel {
  Mic = "audio",
  Camera = "video",
  ScreenSharing = "share",
  Data = "data",
}

export type RtcPermissions = Record<string, boolean>;

export enum RtcMediaPermissionState {
  Unavailable,
  Disabled,
  Enabled,
}

export enum PeerRole {
  Default = "default",
  Moderator = "moderator",
}

export type PrimitiveValue = string | number | boolean;

export type RtcDataChannelMessage = string | Blob | ArrayBuffer;

export enum RtcTransportDirection {
  Recv = "recv",
  Send = "send",
}

// TODO codify context type
export type ErrorReporter = (error: unknown, context?: unknown) => void;

/**
 * @internal
 */
export type OpusCodecOptions = {
  opusStereo?: boolean;
  opusFec?: boolean;
  opusDtx?: boolean;
  opusMaxPlaybackRate?: number;
  opusMaxAverageBitrate?: number;
  opusPtime?: number;
  opusNack?: boolean;
};

export type PeerPublicInfo<PD = Record<string, unknown>> = {
  appData: PD;
  displayName: string;
  hidden: boolean;
  id: string;
  // TODO add priv instead of role
  role: PeerRole;
  screenRecord: boolean; // TODO drop
};

export type PeerPrivateInfo<
  Pub = Record<string, unknown>,
  Priv = Record<string, unknown>
> = PeerPublicInfo<Pub> & {
  privData: Priv;
};

/**
 * @internal
 */
export type VideoCodecOptions = {
  videoGoogleStartBitrate?: number;
  videoGoogleMaxBitrate?: number;
  videoGoogleMinBitrate?: number;
};

/**
 * @internal
 */
export type RtcpFeedback = {
  type: string;
  parameter?: string;
};

export type RtpCodecCapability = ms.RtpCodecCapability;

export type RtcOutgoingStreamOptions = {
  codec?: RtpCodecCapability;
  codecOptions?: OpusCodecOptions | VideoCodecOptions;
  disableTrackOnPause?: boolean;
  encodings?: Array<RTCRtpEncodingParameters>;
  stopTracks?: boolean;
  zeroRtpOnPause?: boolean;
};

export type RtcEndpointOptions = {
  headerExtensions?: (hdrex: RtpHeaderExtension) => boolean;
  codecs?: (codec: RtpCodecCapability) => boolean;
};

export type ProduceDataParameters<
  AppData = Record<string, never>
> = {
  appData?: AppData;
  label: DataMediaLabel;
  ordered?: boolean;
  maxPacketLifeTime?: number;
  maxRetransmits?: number;
  priority?: RTCPriorityType;
  protocol?: string;
};

export enum RtcClientEvents {
  ConsumingReady = "consumingready",
  EndpointCaps = "endpointcaps",
  Failure = "failure", // fatal error
  PeerStreamAvailable = "peerstreamavailable",
  PeerStreamUnavailable = "peerstreamunavailable",
  PermissionsChange = "permissionschange",
  ProducingReady = "producingready",
  Ready = "ready",
}

export type RtcPeerStreamAvailableData = {
  label: RtcMediaLabel;
  peerId: string;
  track: MediaStreamTrack;
  resumed: boolean;
};

export type RtcPeerStreamUnavailableData = {
  label: RtcMediaLabel;
  peerId: string;
  paused: boolean;
};

export enum RtcOutgoingStreamCloseReason {
  TransportClose = "transportclose",
}

export enum RtcOutgoingStreamEvents {
  Close = "close",
  Toggle = "toggle",
}

export interface RtcOutgoingStreamT {
  label: string;
  paused: boolean;

  close(): void;
  // TODO check if on/off are needed
  off(event: RtcOutgoingStreamEvents.Close, fn: (a: { reason: string }) => void): void;
  off(event: RtcOutgoingStreamEvents.Toggle, fn: (a: { paused: boolean; reason: string }) => void): void;
  on(event: RtcOutgoingStreamEvents.Close, fn: (a: { reason: string }) => void): void;
  on(event: RtcOutgoingStreamEvents.Toggle, fn: (a: { paused: boolean; reason: string }) => void): void;
  pause(): Promise<void>;
  resume(): Promise<void>;
  requestLoopback(): void;
  setMediaTrack(track: MediaStreamTrack): Promise<void>;
  setMaxSpatialLayer(layer: number): void;
}
