import { types as ms } from "mediasoup-client";

import { trace } from "../trace/index.js";

import { ICE_RESTART_MAX, RESTART_DELAY, CONN_STABLE_TIMEOUT } from "./params.js";

import { getRestartDelay } from "./utils.js";

const TRACE = "lib.rtckit.internal.RtcTransportIceRestartControl";

/**
 * @internal
 */
export class RtcTransportIceRestartControl {
  private closed = false;

  private restartIceCounter = 0;

  private restartIceTimer: number | null = null;

  private stableTimer: number | null = null;

  /**
   * @param {MeetServerConnectionT} conn
   */
  constructor(private onrestart: () => void, private onfailed: () => void) {}

  close() {
    trace(`${TRACE}.close`, {
      closed: this.closed,
    });
    if (this.closed) {
      return;
    }
    this.onClosed();
  }

  /**
   * {@link https://w3c.github.io/webrtc-pc/#rtcpeerconnectionstate-enum}
   * {@link https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-on-connectionstatechange}
   */
  connectionStateChange(connectionState: ms.ConnectionState) {
    if (this.closed) {
      return;
    }
    if (["failed", "connected", "closed"].includes(connectionState)) {
      this.cancelIceRestart();
    }
    switch (connectionState) {
      case "closed":
        this.onClosed();
        break;
      case "failed":
        this.restartIce();
        break;
      case "disconnected":
        this.scheduleIceRestart();
        break;
      case "connected":
        this.rtcConnected();
        break;
    }
  }

  iceRestartFailed() {
    if (this.restartIceCounter < ICE_RESTART_MAX) {
      this.scheduleIceRestart();
    } else {
      this.onfailed();
    }
  }

  private rtcConnected() {
    this.stableTimer = window.setTimeout(() => {
      this.stableTimer = null;
      this.restartIceCounter = 0;
    }, CONN_STABLE_TIMEOUT);
  }

  private scheduleIceRestart() {
    trace(`${TRACE}.scheduleIceRestart`, {
      restartIceCounter: this.restartIceCounter,
      closed: this.closed,
    });
    this.cancelStableTimer();
    if (this.restartIceTimer) {
      return;
    }
    this.restartIceTimer = window.setTimeout(() => {
      this.restartIceTimer = null;
      this.restartIce();
    }, getRestartDelay(RESTART_DELAY));
  }

  reset() {
    this.cancelIceRestart();
    this.cancelStableTimer();
  }

  private cancelIceRestart() {
    if (this.restartIceTimer) {
      clearTimeout(this.restartIceTimer);
      this.restartIceTimer = null;
    }
  }

  private cancelStableTimer() {
    if (this.stableTimer) {
      clearTimeout(this.stableTimer);
      this.stableTimer = null;
    }
  }

  private restartIce() {
    trace(`${TRACE}.restartIce`,{
      restartIceCounter: this.restartIceCounter,
      closed: this.closed,
    });
    this.restartIceCounter++;
    this.onrestart();
  }

  private onClosed() {
    trace(`${TRACE}.close`, {
        closed: this.closed,
    });
    this.closed = true;
    this.reset();
  }
}
