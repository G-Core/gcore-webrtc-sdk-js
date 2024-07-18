import { EventEmitter } from "eventemitter3";

import { RtcClientT } from "./RtcClient.js";
import { SocketConnection } from "./signaling/SocketConnection.js";
import {
  ConnectedPayload,
  JoinedPayload,
  MessageType as MT,
  type MessageDto,
  type WaitingRoomStatePayload,
} from "./msg/types.js";
import { JoinMessage } from "./msg/JoinMessage.js";

import {
  RtcClientEvents} from "./types.js";
import { PeersController } from "./session/PeersController.js";
import { PeersControllerT, SelfControllerT } from "./session/types.js";
import { SignalConnectionEvents } from "./signaling/types.js";
import { SelfController } from "./session/SelfController.js";
import { trace } from "./trace/index.js";

export enum SessionEvents {
  Closed = "closed",
  Connected = "connected",
  Joined = "joined",
  Ready = "ready",
  WaitingRoomStateChange = "waitingroomstatechange",
}

type ConnectedHandler = (data: ConnectedPayload) => void
type WaitingRoomStateChangeHandler = (state: boolean) => void;

export interface SessionT {
  readonly conn: SocketConnection;
  readonly me: SelfControllerT
  readonly peers: PeersControllerT;
  readonly rtc: RtcClientT;

  join(rejoin?: boolean): void;
  leave(): void;

  on(event: SessionEvents.Connected, cb: ConnectedHandler): void;
  on(event: SessionEvents.Closed, cb: () => void): void;
  on(event: SessionEvents.Joined, cb: () => void): void;
  on(event: SessionEvents.Ready, cb: () => void): void;
  on(event: SessionEvents.WaitingRoomStateChange, cb: WaitingRoomStateChangeHandler): void;

  off(event: SessionEvents.Connected, cb: ConnectedHandler): void;
  off(event: SessionEvents.Closed, cb: () => void): void;
  off(event: SessionEvents.Joined, cb: () => void): void;
  off(event: SessionEvents.Ready, cb: () => void): void;
  off(event: SessionEvents.WaitingRoomStateChange, cb: WaitingRoomStateChangeHandler): void;
}

const TRACE = "lib.rtckit.Session";

export class Session implements SessionT {
  private emitter = new EventEmitter();

  readonly on = this.emitter.on.bind(this.emitter);
  readonly off = this.emitter.off.bind(this.emitter);

  public readonly me: SelfControllerT;
  public readonly peers: PeersControllerT;

  private autoRejoin = false;
  private joined = false;

  constructor(
    public readonly rtc: RtcClientT,
    public readonly conn: SocketConnection,
  ) {
    conn.subscribe((m) => this.handleMessage(m));
    conn.on(SignalConnectionEvents.Close, () => this.emitter.emit(SessionEvents.Closed));
    rtc.on(RtcClientEvents.Ready, () => this.onReady())

    this.me = new SelfController(conn, rtc);
    this.peers = new PeersController(conn, rtc);
  }

  join(rejoin = false) {
    this.autoRejoin = rejoin;
    this.conn.dispatch(new JoinMessage().pack())
  }

  leave() {
    this.conn.close();
  }

  private handleMessage(m: MessageDto) {
    switch (m.type) {
      case MT.Connected:
        this.onConnected(m.data as ConnectedPayload)
        break;
      case MT.Joined:
        this.onJoined(m.data as JoinedPayload)
        break;
      case MT.WaitingRoomState:
        this.emitter.emit(SessionEvents.WaitingRoomStateChange, (m.data as WaitingRoomStatePayload).state);
        break;
    }
  }

  private onConnected(data: ConnectedPayload) {
    this.joined = false;
    this.emitter.emit(SessionEvents.Connected, data as ConnectedPayload);
  }

  private onJoined(data: JoinedPayload) {
    this.joined = true;
    this.emitter.emit(SessionEvents.Joined);
  }

  private onReady() {
    trace(`${TRACE}.onReady`, {joined: this.joined, rejoin: this.autoRejoin});
    this.emitter.emit(SessionEvents.Ready);
    if (this.autoRejoin && !this.joined) {
      this.join(this.autoRejoin);
    }
  }
}
