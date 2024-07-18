import { EventEmitter } from "eventemitter3";
import { type Socket, connect } from "socket.io-client";

import type {
  ConnectionParams,
  MessageAck,
  MessageHandler,
  SignalConnection,
} from "./types.js";
import { SignalConnectionEvents } from "./types.js";
import { type MessageDto as M } from "../msg/types.js";
import { GenericServerResponse, ServerRequestError } from "../errors.js";
import { reportError, trace } from "../trace/index.js";

const TRACE = "lib.rtckit.signaling.SocketConnection";

import { SOCKET_CONNECT_TIMEOUT, SOCKET_SEND_TIMEOUT } from "../settings.js";

class MessageHandlerError extends Error {
  constructor(e: unknown, mtype: string) {
    super(`Error handling message ${mtype}: ${e}`);
  }
}

export class SocketConnection implements SignalConnection {
  private emitter = new EventEmitter();

  on = this.emitter.on.bind(this.emitter);

  off = this.emitter.off.bind(this.emitter);

  private closed = false;

  private handlers: MessageHandler[] = [];

  private socket: Socket;

  constructor(
    serverUrl: string,
    token?: string,
    params: ConnectionParams = {}
  ) {
    const query: Record<string, string> = {...params};
    if (token) {
      query.st = token;
    }
    this.socket = connect(serverUrl, {
      forceNew: true,
      // TODO
      // auth: {
      //   st,
      // },
      query,
      timeout: SOCKET_CONNECT_TIMEOUT,
    });
    this.bindListeners();
  }

  get connected() {
    return this.socket.connected;
  }

  close() {
    this.socket.close();
  }

  connect() {
    this.socket.connect();
  }

  dispatch(m: M, ack?: MessageAck) {
    const cb = ack
      ? (e: Error, resp?: unknown) => {
          if (e) {
            ack(e);
            return;
          }
          if (resp && (resp as GenericServerResponse).error) {
            const err = ServerRequestError.fromResponse(
              (resp as GenericServerResponse).error!,
              m.type
            );
            ack(err);
            return;
          }
          ack(null, resp);
        }
      : undefined;
    this.socket.timeout(SOCKET_SEND_TIMEOUT).send(m, cb);
  }

  subscribe(handler: MessageHandler) {
    if (!this.handlers.includes(handler)) {
      this.handlers.push(handler);
    }
  }

  private bindListeners() {
    this.socket.on("connect", () => this.onConnect());
    this.socket.on("disconnect", (reason) => this.onDisconnect(reason));
    this.socket.on("connect_error", (e) => this.onConnectionError(e));
    this.socket.on("message", (m) => this.handleMessage(m));
  }

  private handleMessage(m: M) {
    this.handlers.forEach((h) => {
      try {
        h(m);
      } catch (e) {
        reportError(new MessageHandlerError(e, m.type));
      }
    });
  }

  private onClose() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.emitter.emit(SignalConnectionEvents.Close);
  }

  private onConnect() {
    const recovered = this.socket.recovered;
    trace(`${TRACE}.onConnect`, {
      recovered,
    });
    this.emitter.emit(SignalConnectionEvents.Connect, recovered);
  }

  private onDisconnect(reason: string) {
    trace(`${TRACE}.onDisconnect.${reason?.replace(" ", "_")}`);
    // TODO on "io server disconnect", reconnect if configured so?
    if (
      reason === "io server disconnect" ||
      reason === "io client disconnect"
    ) {
      this.onClose();
    } else {
      // TODO test
      this.emitter.emit(SignalConnectionEvents.Disconnect, reason);
    }
  }

  private onConnectionError(e: Error) {
    reportError(e);
    this.emitter.emit(SignalConnectionEvents.Failure, e);
  }
}
