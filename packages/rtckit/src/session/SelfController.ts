import { EventEmitter } from "eventemitter3";

import { RtcClientT } from "../RtcClient.js";
import { SocketConnection } from "../signaling/SocketConnection.js";
import {
  ConnectedPayload,
  DismissedPayload,
  MessageType as MT,
  type MessageDto
} from "../msg/types.js";
import { DisplayNameChangeMessage } from "../msg/DisplayNameChangeMessage.js";
import { StatePublishMessage } from "../msg/StatePublishMessage.js";
import { reportError } from "../trace/index.js";
import { UnknownError } from "../errors.js";
import {
  PeerPrivateInfo, PeerRole,
  PrimitiveValue, RtcMediaLabel,
  RtcOutgoingStreamOptions,
  RtcOutgoingStreamT
} from "../types.js";
import { SelfControllerEvents, SelfControllerT } from "./types.js";
import { RtcAutoStream } from "../RtcAutoStream.js";

/**
 * @internal
 */
export class SelfController implements SelfControllerT {
  private data: PeerPrivateInfo = {
    appData: {},
    displayName: "",
    id: "",
    hidden: false,
    privData: {},
    role: PeerRole.Default,
    screenRecord: false,
  };

  private emitter = new EventEmitter();

  private name: string = "";

  private streams: Partial<Record<RtcMediaLabel, RtcOutgoingStreamT>> = {};

  readonly on = this.emitter.on.bind(this.emitter);

  readonly off = this.emitter.off.bind(this.emitter);

  constructor(private conn: SocketConnection, private rtcClient: RtcClientT) {
    conn.subscribe((m) => this.handleMessage(m));
  }

  get displayName() {
    return this.data.displayName;
  }

  get hidden() {
    return this.data.hidden;
  }

  get id() {
    return this.data.id;
  }

  get role() {
    return this.data.role;
  }

  /**
   * Send an audio stream
   * @param track  Media stream track
   * @param options  Additional options
   * @returns
   */
  async sendAudio(track: MediaStreamTrack, options?: RtcOutgoingStreamOptions): Promise<RtcOutgoingStreamT> {
    return this.rtcClient.sendStream(RtcMediaLabel.Mic, track, options);
    // TODO like sendVideo
  }

  /**
   * Send a video stream
   * @param track  Media stream track
   * @param options  Additional options
   * @returns
   */
  async sendVideo(track: MediaStreamTrack, options?: RtcOutgoingStreamOptions): Promise<RtcOutgoingStreamT> {
    return this.sendStream(RtcMediaLabel.Camera, track, options);
  }

  setAttribute(key: string, value: PrimitiveValue): void {
    // TODO
    this.conn.dispatch(new StatePublishMessage(key, value).pack());
  }

  setName(name: string): void {
    // TODO test
    if (this.data.displayName) {
      return;
    }
    this.name = name;
    this.sendName();
  }

  private handleMessage(m: MessageDto) {
    switch (m.type) {
      case MT.Connected:
        this.onConnected(m.data as ConnectedPayload);
        break;
      case MT.Dismissed:
        // toggle join/connection status
        this.emitter.emit(SelfControllerEvents.Dismissed, (m.data as DismissedPayload).reason);
        break;
    }
  }

  private onConnected(data: ConnectedPayload) {
    this.data = data.me;
    // TODO test
    if (this.data.displayName) {
      // Name is sealed
      this.name = this.data.displayName;
    } else if (this.name) {
      this.sendName();
    }
  }

  private sendName() {
    this.conn.dispatch(new DisplayNameChangeMessage(this.name).pack());
  }

  private async sendStream(label: RtcMediaLabel, track: MediaStreamTrack, options?: RtcOutgoingStreamOptions): Promise<RtcOutgoingStreamT> {
    if (!this.streams[label]) {
      const s = new RtcAutoStream(this.rtcClient, label, track, options);
      this.streams[label] = s;
    }
    return this.streams[label]!;
  }
}
