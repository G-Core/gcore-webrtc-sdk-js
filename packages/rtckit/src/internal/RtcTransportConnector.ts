import { EventEmitter } from "eventemitter3";
import { types as ms } from "mediasoup-client";

import { MessageDto as M, MessageType } from "../msg/types.js";
import { BaseMessage } from "../msg/BaseMessage.js";
import type { RtcTransportCreatedPayload } from "../msg/types.js";
import { RtcTransportCloseMessage } from "../msg/RtcTransportCloseMessage.js";
import { RtcTransportConnectMessage } from "../msg/RtcTransportConnectMessage.js";
import { RtcTransportCreateMessage } from "../msg/RtcTransportCreateMessage.js";
import { RtcIceRestartMessage } from "../msg/RtcIceRestartMessage.js";

import type { MessageAck, SignalConnection } from "../signaling/types.js";
import { RtcTransportDirection as Dir } from "../types.js";

import {
  RtcTransportConnectorEvents,
  TransportAppData,
  type RtcTransportConnectorT,
  type RtcTransportRestartControlOptions
} from "./types.js";

import {
  RtcTransportRestartControl,
  RtcTransportRestartControlEvents,
} from "./RtcTransportRestartControl.js";

import { reportError, trace } from "../trace/index.js";

import {
  DeviceNotReadyError,
  EndpointTransportCreateFailedError,
  IceRestartFailedError,
  RemoteIceRestartFailedError,
  RestartFailedError,
  RouterTransportCreateFailed,
  TransportClosedError,
  TransportCreateTimeoutError,
  WrongTransportError,
} from "./errors.js";

import { TRANSPORT_REMOTE_WAIT_TO } from "../settings.js";

type TransportResolve = (transport: ms.Transport) => void;
type TransportReject = (error: Error) => void;

const TRACE = "lib.rtckit.internal.RtcTransportConnector";

/**
 * @internal
 */
export class RtcTransportConnector implements RtcTransportConnectorT {
  private closed = false;

  private device: ms.Device | null = null;

  private emitter = new EventEmitter();

  private iceServers: RTCIceServer[] = [];

  private promises: Array<[TransportResolve, TransportReject]> = [];

  private remoteWaitTimer: number | null = null;

  private restartControl: RtcTransportRestartControl;

  private transport: ms.Transport | null = null;

  public on = this.emitter.on.bind(this.emitter);

  public off = this.emitter.off.bind(this.emitter);

  constructor(
    protected conn: SignalConnection,
    readonly dir: Dir,
    private restartControlOptions: RtcTransportRestartControlOptions,
    private customParams: Partial<ms.TransportOptions> = {}
  ) {
    this.restartControl = new RtcTransportRestartControl(
      conn,
      restartControlOptions
    );
    this.conn.subscribe((m: M) => this.handleMessage(m));
    this.bindRestartHandlers();
  }

  get ready() {
    return !!this.transport;
  }

  /**
   * Close the transport control object irreversibly
   */
  close() {
    if (this.closed) {
      return;
    }
    if (this.transport) {
      this.closeRemoteTransport(this.transport.id);
    }
    this.reset();
    this.device = null;
    this.restartControl.close();
    this.closed = true;
    this.emitter.removeAllListeners();
  }

  /**
   * Return the current transport object or defer until it is initialized
   *
   * If transportId is specified, there is a default transport, and they don't match - error
   * If there is a default transport - return it
   * If there is no transport - wait for it to be created
   *
   * @param transportId
   * @returns
   */
  getObject(transportId?: string): Promise<ms.Transport> {
    return new Promise((resolve, reject) => {
      if (this.closed) {
        return reject(new TransportClosedError());
      }
      if (this.transport) {
        if (transportId && this.transport.id !== transportId) {
          // TODO reset, restart
          reject(new WrongTransportError());
        } else {
          resolve(this.transport);
        }
        return;
      }
      this.promises.push([resolve, reject]);
      // TODO timeout via options
      // TODO use share logic with RtcTransportMultiConnector
      const {
        remoteWaitTimeout = TRANSPORT_REMOTE_WAIT_TO,
      } = this.restartControlOptions;
      setTimeout(() => reject(new TransportCreateTimeoutError()), remoteWaitTimeout);
    });
  }

  addRouter(device: ms.Device) {
    if (this.closed) {
      return;
    }
    if (!this.device) {
      this.device = device;
      this.restartControl.initialize();
    }
  }

  setIceServers(iceServers: RTCIceServer[], iceTransportPolicy?: RTCIceTransportPolicy) {
    this.iceServers = iceServers;
    if (iceTransportPolicy) {
      this.customParams.iceTransportPolicy = iceTransportPolicy;
    }
  }

  start() {
    if (this.closed) {
      return;
    }
    this.restartControl.start();
  }

  /**
   * If endpoint transport exists and match the router's - then skip the creation of a new one
   * If the endpoint transport exists and doesn't match the router's - close it and
   * create a new one matching the router's
   * Otherwise just create a new one
   *
   * @param id  Transport ID from the router
   * @returns
   */
  private checkEndpointTransportReady(id: string): boolean {
    const t = this.transport;
    if (t) {
      if (t.id === id) {
        return true;
      }
      t.close();
      this.transport = null;
    }
    return false;
  }

  private create() {
    if (!this.device || !this.device.loaded) {
      throw new DeviceNotReadyError();
    }
    this.conn.dispatch(
      new RtcTransportCreateMessage(this.dir, {
        sctpCapabilities: this.device.sctpCapabilities,
      }).pack(),
      (err) => {
        if (err) {
          // TODO create error
          this.remoteCreateFailed(err);
        }
      }
    );
    this.cancelRemoteWait();
    // TODO share logic with RtcTransportMultiConnector
    const {
      remoteWaitTimeout = TRANSPORT_REMOTE_WAIT_TO,
    } = this.restartControlOptions;
    this.remoteWaitTimer = window.setTimeout(() => {
      this.remoteCreateFailed(new TransportCreateTimeoutError());
    }, remoteWaitTimeout);
  }

  private createTransport(
    device: ms.Device,
    remoteParams: ms.TransportOptions,
    routerId?: string,
  ): ms.Transport {
    const fullParams = {
      appData: {
        routerId,
      },
      // TODO use iceServers from options
      iceServers: this.iceServers,
      iceTransportPolicy: "all",
      ...remoteParams,
      ...this.customParams,
    } as ms.TransportOptions;
    const t =
      this.dir === Dir.Recv
        ? device.createRecvTransport(fullParams)
        : device.createSendTransport(fullParams);
    return t;
  }

  private handleMessage(m: M) {
    switch (m.type) {
      case MessageType.RtcTransportCreated:
        this.onTransportCreated(m.data as RtcTransportCreatedPayload);
        break;
    }
  }

  private bindTransportListeners(transport: ms.Transport<TransportAppData>) {
    const {
      appData: { routerId },
    } = transport;
    transport.on("connect", ({ dtlsParameters }, cb, eb) => {
      this.conn.dispatch(
        new RtcTransportConnectMessage(transport.id, dtlsParameters, routerId).pack(),
        (e?: Error | null) => {
          if (e) {
            eb(e);
            // TODO report particular error here - unstable network - since there isn't much we can do
            reportError(e);
            // The error will popup up at the produce/consume call site
          } else {
            cb();
          }
        }
      );
    });
    transport.on(
      "connectionstatechange",
      (connectionState: ms.ConnectionState) => {
        switch (connectionState) {
          case "closed":
            this.transportClosed();
            break;
        }
        this.restartControl.connectionStateChange(connectionState);
      }
    );
  }

  private transportClosed() {
    this.transport = null;
  }

  private setObject(transport: ms.Transport) {
    this.transport = transport;
    for (const [r] of this.promises.splice(0, this.promises.length)) {
      r(transport);
    }
  }

  private onTransportCreated(data: RtcTransportCreatedPayload) {
    const { dir, routerId, ...params } = data;
    if (dir !== this.dir) {
      return;
    }
    if (this.closed) {
      trace(`${TRACE}.onTransportCreated.closed`, { dir, routerId});
      return;
    }
    this.cancelRemoteWait();
    const transportId = data.id;
    const msDevice = this.device;
    if (!msDevice) {
      reportError(new DeviceNotReadyError());
      return;
    }
    if (this.checkEndpointTransportReady(transportId)) {
      return;
    }
    try {
      const t = this.createTransport(msDevice, params, routerId);
      this.created(t);
    } catch (error) {
      this.closeRemoteTransport(transportId);
      this.localTransportCreateFailed(error);
    }
  }

  private created(t: ms.Transport) {
    this.bindTransportListeners(t);
    this.restartControl.created();
    this.emitter.emit(RtcTransportConnectorEvents.Created, t);
    this.setObject(t);
    this.emitter.emit(RtcTransportConnectorEvents.Ready);
  }

  private localTransportCreateFailed(e: unknown) {
    reportError(new EndpointTransportCreateFailedError(e, this.dir));
    this.restartControl.localCreateFailed();
  }

  private cancelRemoteWait() {
    if (this.remoteWaitTimer) {
      clearTimeout(this.remoteWaitTimer);
      this.remoteWaitTimer = null;
    }
  }

  private remoteCreateFailed(error: unknown) {
    this.cancelRemoteWait();
    this.createFailed(new RouterTransportCreateFailed(error));
  }

  reset() {
    if (this.transport) {
      this.transport.close();
      this.transport = null;
    }
  }

  // TODO don't send
  private closeRemoteTransport(transportId: string) {
    this.conn.dispatch(new RtcTransportCloseMessage(transportId).pack());
  }

  private createFailed(error: Error) {
    reportError(error);
    this.restartControl.remoteCreateFailed();
  }

  private bindRestartHandlers() {
    this.restartControl.on(RtcTransportRestartControlEvents.IceRestart, () =>
      this.restartIce()
    );
    this.restartControl.on(RtcTransportRestartControlEvents.Start, () =>
      this.doStart()
    );
    this.restartControl.on(RtcTransportRestartControlEvents.Failure, () =>
      this.restartFailed()
    );
  }

  private restartIce() {
    if (!this.transport) {
      trace(`${TRACE}.restartIce.noTransport`);
      return;
    }
    this.iceRestarting(this.transport);
  }

  private iceRestarting(msTransport: ms.Transport) {
    this.conn.dispatch(
      // TODO timeout
      new RtcIceRestartMessage(
        msTransport.id
      ).pack(),
      (e, iceParameters) => {
        if (e) {
          this.remoteIceRestartFailed(e);
        } else {
          this.remoteIceRestarted(
            msTransport,
            iceParameters as ms.IceParameters
          );
        }
      }
    );
  }

  private remoteIceRestartFailed(e: unknown) {
    reportError(new RemoteIceRestartFailedError(e));
    this.iceRestartFailed(e);
  }

  private remoteIceRestarted(
    transport: ms.Transport,
    iceParameters: ms.IceParameters
  ) {
    transport.restartIce({ iceParameters }).then(
      () => this.iceRestarted(),
      (e) => this.iceRestartFailed(e)
    );
  }

  private iceRestarted() {
    this.emitter.emit(RtcTransportConnectorEvents.Ready);
  }

  private iceRestartFailed(error: unknown) {
    const e = new IceRestartFailedError(error);
    reportError(e);
    this.restartControl.iceRestartFailed(error);
  }

  private restartFailed() {
    this.emitter.emit(
      RtcTransportConnectorEvents.Failure,
      new RestartFailedError()
    );
  }

  private doStart() {
    this.reset();
    this.create();
  }
}
