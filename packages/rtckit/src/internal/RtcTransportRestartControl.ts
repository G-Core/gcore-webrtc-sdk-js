import { EventEmitter } from "eventemitter3";
import { types as ms } from "mediasoup-client";

import { MessageType } from "../msg/types.js";

import { SignalConnection, SignalConnectionEvents } from "../signaling/types.js";

import { RtcTransportIceRestartControl } from "./RtcTransportIceRestartControl.js";

import { INITIAL_RESTART_MAX, RESTART_DELAY, RESTART_MAX } from "./params.js";

import { getRestartDelay } from "./utils.js";

import { trace } from "../trace/index.js";
import { ErrorCode, ServerRequestError } from "../errors.js";

import {
  RtcTransportRestartControlOptions
} from "./types.js";

/**
 * @internal
 */
enum State {
  Closed = "closed",
  Failed = "failed",
  InitWait = "initWait",
  Initial = "initial",
  Initialized = "initialized",
  Running = "running",
  Starting = "starting",
}

/**
 * @internal
 */
export enum RtcTransportRestartControlEvents {
  IceRestart = "iceRestart",
  Failure = "failed",
  Ready = "ready",
  Start = "start",
}

const TRACE = "lib.rtckit.internal.RtcTransportRestartControl";

/**
 * @internal
 */
export class RtcTransportRestartControl {
  private emitter = new EventEmitter();

  private iceControl = new RtcTransportIceRestartControl(
    () => this.emitter.emit(RtcTransportRestartControlEvents.IceRestart),
    () => this.emitter.emit(RtcTransportRestartControlEvents.Failure)
  );

  private restartCounter = 0;

  private restartMax: number;

  private state = State.Initial;

  on = this.emitter.on.bind(this.emitter);

  off = this.emitter.off.bind(this.emitter);

  // TODO add label for tracing
  constructor(
    private conn: SignalConnection,
    private options: RtcTransportRestartControlOptions = {}
  ) {
    const {
      restartMaxInitial = INITIAL_RESTART_MAX,
    } = options;
    this.restartMax = restartMaxInitial;
    this.conn.on(SignalConnectionEvents.Connect, () => this.socketConnected());
    this.conn.subscribe(({ type }) => this.handleMessage(type as MessageType));
  }

  close() {
    trace(`${TRACE}.close`, {
      restartCounter: this.restartCounter,
      state: this.state,
    });
    this.reset();
    this.iceControl.close();
    this.closed();
    this.emitter.removeAllListeners();
  }

  /**
   * {@link https://w3c.github.io/webrtc-pc/#rtcpeerconnectionstate-enum}
   * {@link https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-on-connectionstatechange}
   */
  connectionStateChange(connectionState: ms.ConnectionState) {
    // TODO check applicable states
    if (this.state !== State.Running) {
      return;
    }
    this.iceControl.connectionStateChange(connectionState);
    // TODO check if it's actually needed
    if (connectionState === "closed") {
      this.closed();
    }
  }

  created() {
    if (this.state === State.Closed) {
      return;
    }
    this.running();
  }

  iceRestartFailed(error: unknown) {
    if (error instanceof ServerRequestError && error.code === ErrorCode.RtcTransportNotFound) {
      // There must be full restart going on
      // TODO test
      this.iceControl.reset();
      return;
    }
    this.iceControl.iceRestartFailed();
  }

  // TODO rename
  initialize() {
    switch (this.state) {
      case State.Initial:
        this.state = State.Initialized;
        if (this.options.eagerStart) {
          this.doStart();
        }
        break;
      case State.InitWait:
        this.state = State.Initialized;
        this.doStart();
        break;
    }
  }

  localCreateFailed() {
    // non-retrieable error
    trace(`${TRACE}.localCreateFailed`, {
      restartCounter: this.restartCounter,
      state: this.state,
    });
    if (this.state === State.Closed) {
      return;
    }
    this.state = State.Failed;
    this.emitter.emit(RtcTransportRestartControlEvents.Failure);
  }

  remoteCreateFailed() {
    // retrieable error
    trace(`${TRACE}.remoteCreateFailed`, {
      restartCounter: this.restartCounter,
      state: this.state,
    });
    if (this.state === State.Closed) {
      return;
    }
    this.state = State.Failed;

    const isFatal = this.restartCounter >= this.restartMax;
    if (isFatal) {
      this.emitter.emit(RtcTransportRestartControlEvents.Failure);
      return;
    }
    if (this.options.restartOnFail) {
      this.scheduleRestart();
    }
  }

  reset() {
    if (this.state === State.Closed) {
      return;
    }
    this.state = State.Initial;
    this.restartCounter = 0;
    this.iceControl.reset();
  }

  /**
   * Explicit start
   */
  start() {
    switch (this.state) {
      case State.Initialized:
      case State.Failed:
        this.doStart();
        break;
      case State.Initial:
        this.state = State.InitWait;
        break;
    }
  }

  private doStart() {
    this.state = State.Starting;
    this.emitter.emit(RtcTransportRestartControlEvents.Start);
  }

  private running() {
    this.state = State.Running;
    this.restartCounter = 0;
    const {
      restartMax = RESTART_MAX,
    } = this.options;
    this.restartMax = restartMax;
    this.emitter.emit(RtcTransportRestartControlEvents.Ready);
  }

  // This happens after hard reconnect
  private restart() {
    trace(`${TRACE}.restart`, {
      restartCounter: this.restartCounter,
      state: this.state,
    });
    if (![State.Running, State.Failed].includes(this.state)) {
      return;
    }
    this.restartCounter++;
    this.state = State.Initialized;
    this.start();
  }

  private handleMessage(type: MessageType) {
    switch (type) {
      case MessageType.Connected:
        this.restart();
        break;
    }
  }

  private closed() {
    trace(`${TRACE}.closed`, {
      restartCounter: this.restartCounter,
      state: this.state,
    });
    this.state = State.Closed;
  }

  private scheduleRestart() {
    trace(`${TRACE}.scheduleRestart`, {
      restartCounter: this.restartCounter,
      state: this.state,
    });
    this.iceControl.reset();
    const {
      restartDelay = RESTART_DELAY,
    } = this.options;
    setTimeout(() => {
      // TODO test
      if (this.conn.connected) {
        this.restart();
      } else {
        // TODO check use of socketConnected event
        // this.scheduleRestart();
      }
    }, getRestartDelay(restartDelay));
  }

  private socketConnected() {
    if (this.state === State.Failed && this.options.restartOnFail) {
      this.restart();
    }
  }
}
