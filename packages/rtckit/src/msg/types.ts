import type { types as ms } from "mediasoup-client";

import type {
  ConsumerAppData,
  DataConsumerAppData,
  DataProducerAppData,
} from "../internal/types.js";
import type { ErrorCode } from "../errors.js";
import type {
  DataMediaLabel,
  PeerIceState,
  PeerPrivateInfo,
  PeerPublicInfo,
  PrimitiveValue,
  RtcMediaLabel,
  RtcPermissions,
  RtcTransportDirection,
} from "../types.js";

export { BaseMessage } from "./BaseMessage.js";

export enum MessageType {
  // Legacy
  // TODO add RtcDominantSpeaker
  Connected = "i:connected",
  Dismiss = "p:dismiss", // == former removeUser; priv ->
  Dismissed = "i:dismissed",
  DisplayNameChange = "changeDisplayName",
  // DebugInfo = "debugInfo", // peer -> room
  Error = "i:error", // peer <- room, TODO dub the "error"
  Join = "join", // peer ->
  JoinCancel = "i:joinCancel",
  JoinRequest = "i:joinRequest", // TODO move to separate list
  // TODO use it
  JoinRequestResolve = "p:joinRequestResolve", // TODO move away?
  JoinRequestResolved = "i:joinRequestResolved", // TODO move away?
  Joined = "i:joined", // peer <- room
  // PeerDebugInfo = "i:peerDebugInfo", // room -> peer:moderator...
  PeerConnectionState = "i:peerConnectionState", // peer... <- room
  PeerJoined = "i:peerJoined", // peer... <- room TODO sync with legacy
  PeerLeft = "i:peerLeft", // peer... <- room
  PeerNameChange = "i:peerNameChange", // peer... <- room
  PeerState = "i:peerState", // peer's state attribute has changed
  Peers = "i:peers", // former peersInRoom

  RtcAudioLevels = "r:i:audioLevels", // peer <- router
  RtcConsumerClosed = "r:i:consumerClosed", // peer <-
  RtcConsumerCreated = "r:i:consumerCreated", // peer <-
  RtcConsumerKeyFrameRequest = "r:consumerKeyFrameRequest", // peer ->
  RtcConsumerLayersSet = "r:consumerLayersSet", // peer ->
  RtcConsumerPriority = "r:consumerPriority", // peer ->
  RtcConsumerScore = "r:i:consumerScore", // peer <-
  RtcConsumerState = "r:i:consumerState", // [paused/running] peer <- server
  RtcConsumerToggle = "r:toggleConsumer", // peer ->
  RtcDataConsumerCreated = "r:i:dataConsumerCreated", // peer <-
  RtcDataConsumerClosed = "r:i:dataConsumerClosed", // peer <-
  RtcDataConsumerClose = "r:closeDataConsumer", // peer ->
  RtcDataProduce = "r:produceData", // peer ->
  RtcDataProducerClose = "r:closeDataProducer", // peer ->
  RtcEndpointCaps = "r:endpointCaps", // peer ->
  RtcIceRestart = "r:iceRestart", // peer ->
  RtcIbrPeerMax = "r:p:ibrPeerMax",
  RtcLoopbackConsumerRequest = "r:requestLoopbackConsumer", // peer ->
  RtcLoopbackDataConsumerRequest = "r:requestLoopbackDataConsumer", // peer ->
  RtcMediaStop = "r:p:mediaStop",
  RtcPermissions = "r:i:permissions",
  RtcPermissionSet = "r:p:permissionSet",
  RtcProduce = "r:produce", // peer ->
  RtcProducerClose = "r:closeProducer", // peer ->
  RtcProducerClosed = "r:producerClosed", // peer ->
  RtcProducerScore = "r:i:producerScore", // peer <-
  RtcProducerState = "r:i:producerState", // peer <-
  RtcProducerToggle = "r:toggleProducer", // peer ->
  RtcRouterCaps = "r:i:routerCaps", // peer <-
  RtcTransportClose = "r:transportClose", // peer ->
  RtcTransportConnect = "r:transportConnect", // peer ->
  RtcTransportCreate = "r:transportCreate", // peer ->
  // TODO perhaps drop
  RtcTransportCreated = "r:i:transportCreated", // peer <-
  RtcTestConsumerRequest = "r:requestTestConsumer", // peer ->

  StatePublish = "statePublish", // set state attribute to themselves

  WaitingRoom = "i:waitingRoom", // peer <- room
  WaitingRoomSet = "p:waitingRoomSet", // priv peer -> room
  WaitingRoomState = "i:waitingRoomState", // peer <- room
}

export type ErrorPayload = {
  code: ErrorCode;
  params: Record<string, unknown>;
};

export type PeerStatePayload = {
  peerId: string;
  key: string;
  value: PrimitiveValue;
};

export type StatePublishPayload = {
  key: string;
  value: PrimitiveValue;
};

export type PeerNameChangedPayload = {
  peerId: string;
  displayName: string;
  oldDisplayName: string;
};

export type DisplayNameChangePayload = {
  displayName: string;
};

export type PeerConnectionStatePayload = {
  peerId: string;
  connected: boolean;
};

export type RtcAudioLevelsPayload = {
  speakers: string[]; // empty means silence
  // TODO dominant peer
  routerId: string;
};

export type RtcConsumerScorePayload = {
  peerId: string;
  label: string;
  score: number;
};

export type RtcIceRestartPayload = {
  transportId: string;
  routerId?: string;
};

export type RtcLoopbackConsumerRequestPayload = {
  producerId: string;
  // transportId: string;
};

export type RtcMediaStopPayload = {
  label: string;
  peerId: string | null;
};

export type RtcPermissionsSetPayload = {
  label: string;
  peerId: string | null;
  allow: boolean;
};

export type RtcProducerScorePayload = {
  label: string;
  score: number;
};

// export type PeerClientDeviceInfo = {
//   name: string;
//   os: string;
//   type: "mobile" | "desktop";
//   version: string;
// }

// export type PeerDebugInfo = {
//   device: PeerClientDeviceInfo;
// }

// export type PeerDebugInfoPayload = {
//   peerId: string;
//   debugInfo: PeerDebugInfo;
// }

// export type DebugInfoPayload = {
//   debugInfo: PeerDebugInfo;
// }

export type RtcProducerClosedPayload = {
  id: string;
  reason: string;
};

export type RtcProducerStatePayload = {
  id: string;
  paused: boolean;
  reason: string;
};

export type RtcProducerTogglePayload = {
  id: string;
  paused: boolean;
};

export type RtcRouterCapsPayload = {
  routerId: string; // TODO
  rtpCapabilities: ms.RtpCapabilities;
};

export type RtcEndpointCapsPayload = {
  rtpCapabilities: ms.RtpCapabilities;
  sctpCapabilities?: ms.SctpCapabilities;
};

export type JoinedPayload = {
  nodeId: string;
};

export type PeersPayload = {
  peers: PeerPublicInfo[];
  nodeId: string;
};

export type JoinRequestPayload = JoinRequestInfo;

export type JoinRequestResolvedPayload = {
  peerId?: string;
  ok: boolean;
};

export type JoinCancelPayload = {
  peerId: string;
};

export type JoinRequestResolvePayload = {
  ok: boolean;
  peerId?: string;
};

export type JoinRequestInfo = {
  peerId: string;
  displayName: string;
};

export type WaitingRoomPayload = {
  peers: JoinRequestInfo[];
};

export type WaitingRoomStatePayload = {
  state: boolean;
};

export type WaitingRoomSetPayload = {
  state: boolean;
};

export type ConnectedPayload<
  PD = Record<string, never>,
  RD = Record<string, never>
> = {
  me: PeerPrivateInfo<PD>;
  room: {
    appData: RD;
    sid: string;
    waitingRoom: boolean;
    webinar: boolean;
  };
};

export enum DismissReason {
  Unknown = 0,
  RoomClosed = 1,
  JoinRequestRejected = 2,
  Moderation = 3,
}

export type DismissPayload = {
  peerId: string;
  reason: DismissReason;
};

export type DismissedPayload = {
  reason: DismissReason;
};

export type JoinPayload = Record<string, never>;

export type RtcConsumerKeyFrameRequestPayload = {
  id: string;
  routerId?: string;
};

export type RtcConsumerLayersSetPayload = {
  id: string;
  spatialLayer: number;
  temporalLayer: number;
  routerId?: string;
};

export type RtcConsumerPriorityPayload = {
  id: string;
  priority: number;
  routerId?: string;
};

export type RtcDataProducePayload<
  AppDataT = Record<string, never>
> = {
  appData: DataProducerAppData & AppDataT;
  label: DataMediaLabel;
  protocol?: string;
  sctpStreamParameters: ms.SctpStreamParameters;
  transportId: string;
};

export type RtcDataProduceAckPayload = {
  id: string;
};

export type RtcDataConsumerCreatedPayload = {
  appData: DataConsumerAppData;
  dataProducerId: string;
  id: string;
  label: DataMediaLabel;
  protocol: string;
  sctpStreamParameters: ms.SctpStreamParameters;
};

export type RtcDataConsumerClosedPayload = {
  id: string;
};

export type RtcIbrPeerMaxPayload = {
  peerId: string;
  value: number;
};

export type RtcProducePayload = {
  appData: Record<string, unknown>;
  kind: ms.MediaKind;
  rtpParameters: ms.RtpParameters;
  transportId: string;
};

export type RtcTransportClosePayload = {
  id: string;
  routerId?: string;
};

export type RtcTransportConnectPayload = {
  id: string;
  dtlsParameters: ms.DtlsParameters;
  routerId?: string;
};

export type RtcTransportCreatePayload = {
  dir: RtcTransportDirection;
  sctpCapabilities?: ms.SctpCapabilities;
};

export type RtcTransportCreatedPayload = {
  dir: RtcTransportDirection;
  dtlsParameters: ms.DtlsParameters;
  iceCandidates: [ms.IceCandidate];
  iceParameters: ms.IceParameters;
  id: string;
  routerId?: string;
  sctpParameters: ms.SctpParameters;
};

export type RtcConsumerCreatedPayload = {
  appData: ConsumerAppData;
  id: string;
  kind: ms.MediaKind;
  producerId: string;
  rtpParameters: ms.RtpParameters;
  streamId?: string;
};

export type RtcTestConsumerRequestPayload = {
  label: RtcMediaLabel;
  // transportId: string;
};

export type RtcConsumerTogglePayload = {
  id: string;
  paused: boolean;
  routerId?: string;
};

export type RtcConsumerStatePayload = {
  id: string;
  paused: boolean;
  producerPaused: boolean;
};

export type RtcConsumerClosedPayload = {
  id: string;
};

// TODO remove
export type RtcRequestLoopbackDataConsumerPayload = {
  id: string;
};

export type RtcConsumerClosePayload = {
  id: string;
  routerId?: string;
};

export type RtcDataConsumerClosePayload = {
  id: string;
  routerId?: string;
};

export type PeerLeftPayload = {
  id: string;
};

export type PeerJoinedPayload<PD = Record<string, unknown>> =
  PeerPublicInfo<PD>;

export type RtcPermissionsPayload = {
  current: RtcPermissions;
  available: RtcPermissions;
};

export type MessagePayload<T extends string> = T extends MessageType.Connected
  ? ConnectedPayload
  : T extends MessageType.Dismiss
  ? DismissPayload
  : T extends MessageType.Dismissed
  ? DismissedPayload
  : T extends MessageType.DisplayNameChange
  ? DisplayNameChangePayload
  : T extends MessageType.Join
  ? JoinPayload
  : T extends MessageType.JoinRequest
  ? JoinRequestPayload
  : T extends MessageType.JoinRequestResolve
  ? JoinRequestResolvePayload
  : T extends MessageType.Joined
  ? JoinedPayload
  : // : T extends MessageType.PeerDebugInfo
  // ? PeerDebugInfoPayload
  T extends MessageType.PeerState
  ? PeerStatePayload
  : T extends MessageType.StatePublish
  ? StatePublishPayload
  : T extends MessageType.PeerConnectionState
  ? PeerConnectionStatePayload
  : T extends MessageType.PeerJoined
  ? PeerJoinedPayload
  : T extends MessageType.PeerLeft
  ? PeerLeftPayload
  : T extends MessageType.PeerNameChange
  ? PeerNameChangedPayload
  : T extends MessageType.Peers
  ? PeersPayload
  : T extends MessageType.RtcConsumerCreated
  ? RtcConsumerCreatedPayload
  : T extends MessageType.RtcConsumerKeyFrameRequest
  ? RtcConsumerKeyFrameRequestPayload
  : T extends MessageType.RtcConsumerLayersSet
  ? RtcConsumerLayersSetPayload
  : T extends MessageType.RtcConsumerPriority
  ? RtcConsumerPriorityPayload
  : T extends MessageType.RtcConsumerScore
  ? RtcConsumerScorePayload
  : T extends MessageType.RtcConsumerState
  ? RtcConsumerStatePayload
  : T extends MessageType.RtcConsumerClosed
  ? RtcConsumerClosedPayload
  : T extends MessageType.RtcConsumerToggle
  ? RtcConsumerTogglePayload
  : T extends MessageType.RtcDataConsumerCreated
  ? RtcDataConsumerCreatedPayload
  : T extends MessageType.RtcDataConsumerClosed
  ? RtcDataConsumerClosedPayload
  : T extends MessageType.RtcDataProduce
  ? RtcDataProducePayload
  : T extends MessageType.RtcEndpointCaps
  ? RtcEndpointCapsPayload
  : T extends MessageType.RtcIceRestart
  ? RtcIceRestartPayload
  : T extends MessageType.RtcLoopbackConsumerRequest
  ? RtcLoopbackConsumerRequestPayload
  : T extends MessageType.RtcMediaStop
  ? RtcMediaStopPayload
  : T extends MessageType.RtcPermissions
  ? RtcPermissionsPayload
  : T extends MessageType.RtcPermissionSet
  ? RtcPermissionsSetPayload
  : T extends MessageType.RtcProduce
  ? RtcProducePayload
  : T extends MessageType.RtcProducerScore
  ? RtcProducerScorePayload
  : T extends MessageType.RtcProducerState
  ? RtcProducerStatePayload
  : T extends MessageType.RtcRouterCaps
  ? RtcRouterCapsPayload
  : T extends MessageType.RtcTransportCreated
  ? RtcTransportCreatedPayload
  : T extends MessageType.RtcTestConsumerRequest
  ? RtcTestConsumerRequestPayload
  : T extends MessageType.RtcTransportClose
  ? RtcTransportClosePayload
  : T extends MessageType.RtcTransportConnect
  ? RtcTransportConnectPayload
  : T extends MessageType.RtcTransportCreate
  ? RtcTransportCreatePayload
  : T extends MessageType.WaitingRoom
  ? WaitingRoomPayload
  : T extends MessageType.WaitingRoomSet
  ? WaitingRoomSetPayload
  : T extends MessageType.WaitingRoomState
  ? WaitingRoomStatePayload
  : T extends MessageType.RtcIbrPeerMax
  ? RtcIbrPeerMaxPayload
  : never;

export type MessageDto<T extends MessageType = MessageType> = {
  type: T;
  data: MessagePayload<T>;
};
