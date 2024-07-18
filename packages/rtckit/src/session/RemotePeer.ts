import { EventEmitter } from "eventemitter3";

import { MediaLabel, PeerPublicInfo } from "../types.js";
import { RemotePeerT, RemotePeerEvents } from "./types.js";
import { PeerStreams } from "./PeersController.js";

export class RemotePeer implements RemotePeerT {
  private emitter = new EventEmitter();

  on = this.emitter.on.bind(this.emitter);

  off = this.emitter.off.bind(this.emitter);

  private streams: PeerStreams = {};

  constructor(private data: PeerPublicInfo) { }

  get appData() {
    return this.data.appData;
  }

  get id() {
    return this.data.id;
  }

  get role() {
    return this.data.role;
  }

  get hidden() {
    return this.data.hidden;
  }

  get displayName() {
    return this.data.displayName;
  }

  changeName(displayName: string, oldDisplayName: string) {
    this.data.displayName = displayName;
    this.emitter.emit(RemotePeerEvents.NameChanged, { displayName, oldDisplayName });
  }

  close(hasLeft = true) {
    if (hasLeft) {
      this.emitter.emit(RemotePeerEvents.Left);
    }
    this.emitter.removeAllListeners();
  }

  getStream(label: MediaLabel): MediaStreamTrack | undefined {
    return this.streams[label];
  }

  setStreamAvailable(label: MediaLabel, track: MediaStreamTrack) {
    this.streams[label] = track;
    this.emitter.emit(RemotePeerEvents.Stream, { label, track });
  }

  setJoined() {
    this.emitter.emit(RemotePeerEvents.Joined);
  }

  setStreamUnavailable(label: MediaLabel) {
    delete this.streams[label];
    this.emitter.emit(RemotePeerEvents.NoStream, label);
  }

  update(data: Partial<PeerPublicInfo>) {
    Object.assign(this.data, data);
  }
}
