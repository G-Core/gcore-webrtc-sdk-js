import { EventEmitter } from "eventemitter3";

import { RtcClientT } from "../RtcClient.js";
import { SocketConnection } from "../signaling/SocketConnection.js";
import {
  MessageType as MT, PeerNameChangedPayload, PeersPayload,
  type MessageDto,
  type PeerJoinedPayload,
  type PeerLeftPayload
} from "../msg/types.js";
import { MediaLabel, PeerPublicInfo, RtcClientEvents, RtcPeerStreamAvailableData, RtcPeerStreamUnavailableData } from "../types.js";
import { PeersControllerT, PeersControllerEvents, RemotePeerT } from "./types.js";
import { PeerId } from "../types.js";
import { RemotePeer } from "./RemotePeer.js";
import { trace } from "../trace/index.js";

const TRACE = "lib.rtckit.session.PeersController";

export type PeerStreams = Record<MediaLabel, MediaStreamTrack>;
export class PeersController implements PeersControllerT {
  private emitter = new EventEmitter();

  on = this.emitter.on.bind(this.emitter);

  off = this.emitter.off.bind(this.emitter);

  private items = new Map<string, RemotePeer>();

  private streams: Map<PeerId, PeerStreams> = new Map();

  constructor(conn: SocketConnection, rtc: RtcClientT) {
    conn.subscribe((m) => this.handleMessage(m));
    rtc.on(RtcClientEvents.PeerStreamAvailable, (data) => this.onPeerStreamAvailable(data));
    rtc.on(RtcClientEvents.PeerStreamUnavailable, (data) => this.onPeerStreamUnavailable(data));
  }

  get(peerId: string): RemotePeerT | undefined {
    return this.items.get(peerId);
  }

  private handleMessage(m: MessageDto) {
    switch (m.type) {
      case MT.Connected:
        this.onConnected();
        break;
      case MT.PeerJoined:
        this.onPeerJoined(m.data as PeerJoinedPayload);
        break;
      case MT.PeerLeft:
        this.onPeerLeft(m.data as PeerLeftPayload);
        break;
      case MT.PeerNameChange:
        this.onPeerNameChanged(m.data as PeerNameChangedPayload);
        break;
      case MT.Peers:
        this.onPeers(m.data as PeersPayload);
        break;
    }
  }

  private onConnected() {
    this.resetPeers();
  }

  private resetPeers() {
    for (const peer of this.items.values()) {
      peer.close(false);
    }
    this.items.clear();
    this.streams.clear();
    this.emitter.emit(PeersControllerEvents.Reset);
  }

  private onPeerJoined(data: PeerJoinedPayload) {
    const peer = this.addPeer(data);
    peer.setJoined();
    this.emitter.emit(PeersControllerEvents.PeerJoined, peer);
  }

  private onPeerLeft({ id }: PeerLeftPayload) {
    const peer = this.items.get(id);
    if (peer) {
      this.items.delete(id);
      this.emitter.emit(PeersControllerEvents.PeerLeft, id);
      peer.close()
    }
  }

  private onPeers({peers}: PeersPayload) {
    for (const item of peers) {
      this.addPeer(item);
    }
  }

  private addPeer(peerInfo: PeerPublicInfo) {
    const { id, ...props } = peerInfo;
    const peer = this.items.get(id);
    if (peer) {
      peer.update(props);
      return peer;
    }
    const newPeer = new RemotePeer(peerInfo);
    this.items.set(id, newPeer);
    trace(`${TRACE}.addPeer`, { peerInfo });
    this.emitter.emit(PeersControllerEvents.NewPeer, newPeer);
    for (const [label, track] of Object.entries(this.getPeerStreams(id))) {
      newPeer.setStreamAvailable(label, track);
    }
    return newPeer;
  }

  private getPeerStreams(id: string): PeerStreams {
    const ps = this.streams.get(id);
    if (ps) {
      return ps;
    }
    const newPs = {};
    this.streams.set(id, newPs);
    return newPs;
  }

  private onPeerStreamAvailable({ peerId, label, track }: RtcPeerStreamAvailableData) {
    const ps = this.getPeerStreams(peerId);
    ps[label] = track;
    const peer = this.items.get(peerId);
    if (peer) {
      peer.setStreamAvailable(label, track);
    }
  }

  private onPeerStreamUnavailable({ peerId, label }: RtcPeerStreamUnavailableData) {
    const ps = this.getPeerStreams(peerId);
    delete ps[label];
    const peer = this.items.get(peerId);
    if (peer) {
      peer.setStreamUnavailable(label);
    }
  }

  private onPeerNameChanged({ peerId, displayName, oldDisplayName }: PeerNameChangedPayload) {
    const peer = this.items.get(peerId);
    if (peer) {
      peer.changeName(displayName, oldDisplayName);
    }
  }
}
