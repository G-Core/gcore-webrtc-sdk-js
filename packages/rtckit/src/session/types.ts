import { DismissReason } from "../msg/types.js";
import {
  MediaLabel,
  PeerId,
  PeerPublicInfo,
  PeerRole,
  PrimitiveValue, RtcOutgoingStreamOptions,
  RtcOutgoingStreamT,
} from "../types.js";

export enum PeersControllerEvents {
  NewPeer = "newpeer",
  PeerJoined = "peerjoined",
  PeerLeft = "peerleft",
  Reset = "reset",
}

export interface PeersControllerT {
  on(event: PeersControllerEvents.NewPeer, cb: (peer: RemotePeerT) => void): void;
  on(event: PeersControllerEvents.PeerJoined, cb: (peer: RemotePeerT) => void): void;
  on(event: PeersControllerEvents.PeerLeft, cb: (peerId: PeerId) => void): void;
  off(event: PeersControllerEvents.NewPeer, cb: (peer: RemotePeerT) => void): void;
  off(event: PeersControllerEvents.PeerJoined, cb: (peer: RemotePeerT) => void): void;
  off(event: PeersControllerEvents.PeerLeft, cb: (peerId: PeerId) => void): void;

  get(id: PeerId): RemotePeerT | undefined;
}

export enum RemotePeerEvents {
  Joined = "joined",
  Left = "left",
  NameChanged = "namechanged",
  NoStream = "nostream",
  Stream = "stream",
}

type NameChangedData = {
  displayName: string;
  oldDisplayName: string;
};

type PeerStreamData = {
  label: string;
  track: MediaStreamTrack;
};

export interface RemotePeerT {
  readonly appData: PeerPublicInfo["appData"];
  readonly id: PeerId;
  readonly hidden: boolean;
  readonly role: PeerRole;
  readonly displayName: string;

  getStream(label: string): MediaStreamTrack | undefined;

  on(event: RemotePeerEvents.Left, cb: () => void): void;
  on(event: RemotePeerEvents.NameChanged, cb: (data: NameChangedData) => void): void;
  on(event: RemotePeerEvents.NoStream, cb: (label: string) => void): void;
  on(event: RemotePeerEvents.Stream, cb: (data: PeerStreamData) => void): void;
  off(event: RemotePeerEvents.Left, cb: () => void): void;
  off(event: RemotePeerEvents.NameChanged, cb: (data: NameChangedData) => void): void;
  off(event: RemotePeerEvents.NoStream, cb: (label: string) => void): void;
  off(event: RemotePeerEvents.Stream, cb: (data: PeerStreamData) => void): void;
}


export enum SelfControllerEvents {
  Dismissed = "dismissed",
}

export interface SelfControllerT {
  readonly displayName: string;
  readonly hidden: boolean;
  readonly id: string;
  readonly role: PeerRole;

  on(event: SelfControllerEvents.Dismissed, cb: (reason: DismissReason) => void): void;

  sendAudio(track: MediaStreamTrack, options?: RtcOutgoingStreamOptions): Promise<RtcOutgoingStreamT>;
  sendVideo(track: MediaStreamTrack, options?: RtcOutgoingStreamOptions): Promise<RtcOutgoingStreamT>;
  setAttribute(key: string, value: PrimitiveValue): void;
  setName(name: string): void;
}
