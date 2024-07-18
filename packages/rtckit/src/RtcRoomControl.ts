import { MessageDto as M } from "./msg/types.js";
import type { SignalConnection } from "./signaling/types.js";


import { RtcMediaStopMessage } from "./msg/RtcMediaStopMessage.js";
import { RtcPermissionSetMessage } from "./msg/RtcPermissionSetMessage.js";
import { WaitingRoomSetMessage } from "./msg/WaitingRoomSetMessage.js";

export interface RtcRoomControlT {
  stopPeerMedia(label: string, peerId: string): void;
  stopRoomMedia(label: string): void;
  setPeerPermission(label: string, peerId: string, allow: boolean): void;
  setRoomPermission(label: string, allow: boolean): void;
  toggleWaitingRoom(state: boolean): void;
}

export class RtcRoomControl implements RtcRoomControlT {
  constructor(private conn: SignalConnection) {}

  stopPeerMedia(label: string, peerId: string) {
    this.conn.dispatch(new RtcMediaStopMessage(label, peerId).pack());
  }

  stopRoomMedia(label: string) {
    this.conn.dispatch(new RtcMediaStopMessage(label, null).pack());
  }

  setPeerPermission(label: string, peerId: string, allow: boolean) {
    this.conn.dispatch(new RtcPermissionSetMessage(label, peerId, allow).pack());
  }

  setRoomPermission(label: string, allow: boolean) {
    this.conn.dispatch(new RtcPermissionSetMessage(label, null, allow).pack());
  }

  toggleWaitingRoom(state: boolean) {
    this.conn.dispatch(new WaitingRoomSetMessage(state).pack());
  }

  // TODO remove user, join requiest/accept/reject/clear
}
