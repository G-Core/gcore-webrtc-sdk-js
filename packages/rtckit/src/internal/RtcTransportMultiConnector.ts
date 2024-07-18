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
  type RtcTransportConnectorT,
  type RtcTransportRestartControlOptions,
  type TransportAppData,
} from "./types.js";

import {
  RtcTransportRestartControl,
  RtcTransportRestartControlEvents,
} from "./RtcTransportRestartControl.js";

import { reportError, trace } from "../trace/index.js";
import { RtcTransportIceRestartControl } from "./RtcTransportIceRestartControl.js";

import {
  DeviceNotReadyError,
  EndpointTransportCreateFailedError,
  IceRestartFailedError,
  RemoteIceRestartFailedError,
  RestartFailedError,
  RouterTransportCreateFailed,
  TransportCreateTimeoutError,
  WrongTransportError,
} from "./errors.js";

import { TRANSPORT_REMOTE_WAIT_TO } from "../settings.js";

type TransportResolve = (transport: ms.Transport) => void;
type TransportReject = (error: Error) => void;

const TRACE = "lib.rtckit.internal.RtcTransportMultiConnector";

/**
 * @internal
 */
export class RtcTransportMultiConnector implements RtcTransportConnectorT {
  private device: ms.Device | null = null;

  private emitter = new EventEmitter();

  private iceServers: RTCIceServer[] = [];

  private transports: Map<string, ms.Transport<TransportAppData>> = new Map();
  private transportsIce: Map<string, RtcTransportIceRestartControl> = new Map();

  private primaryRouterId: string | undefined;
  private primaryTransportId: string | undefined;

  private promises: Array<[TransportResolve, TransportReject]> = [];

  private remoteWaitTimer: number | null = null;

  // Primary router transport restart control
  private restartControl: RtcTransportRestartControl;

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
    return !!this.primaryTransportId;
  }

  addRouter(device: ms.Device, routerId: string) {
    if (!this.device) {
      this.device = device;
      this.primaryRouterId = routerId;
      this.restartControl.initialize();
    }
  }

  close() {
    for (const t of this.transports.values()) {
      this.closeRemoteTransport(t.id, t.appData.routerId);
    }
    this.transports.clear();
    this.primaryTransportId = undefined;
    this.device = null;
    for (const ice of this.transportsIce.values()) {
      ice.close();
    }
    this.transportsIce.clear();
    this.restartControl.close();
    this.emitter.removeAllListeners();
  }

  getObject(transportId?: string): Promise<ms.Transport> {
    // If transportId is not specified -> get the primary transport or wait for it
    // if transportId is specified and there is the transport -> yield
    // otherwise error
    return new Promise((resolve, reject) => {
      if (transportId) {
        // TODO wait for RtcTransportCreated for some time (like for primary transport)?
        return resolve(this.getTransport(transportId));
      }
      if (this.primaryTransportId) {
        return resolve(this.getTransport(this.primaryTransportId));
      }
      // Wait for primary router transport
      this.promises.push([resolve, reject]);
      const {
        remoteWaitTimeout = TRANSPORT_REMOTE_WAIT_TO,
      } = this.restartControlOptions;
      setTimeout(() => reject(new TransportCreateTimeoutError()), remoteWaitTimeout);
    });
  }

  reset() {
    for (const t of this.transports.values()) {
      t.close();
    }
    this.transports.clear();
    // device is not reset
    this.primaryTransportId = undefined;

    for (const ice of this.transportsIce.values()) {
      ice.close();
    }
    this.transportsIce.clear();
  }

  setIceServers(iceServers: RTCIceServer[], iceTransportPolicy: RTCIceTransportPolicy = "all") {
    this.iceServers = iceServers;
    if (iceTransportPolicy !== "all") {
      this.customParams.iceTransportPolicy = iceTransportPolicy;
    }
  }

  start() {
    this.restartControl.start();
  }

  private checkTransportExists(id: string): boolean {
    return this.primaryTransportId === id && this.transports.has(id);
  }

  private create() {
    if (!this.device || !this.device.loaded) {
      throw new DeviceNotReadyError();
    }
    this.dispatch(
      // This always goes to the primary router
      // Recv transport on a peer's router is created by the router itself
      new RtcTransportCreateMessage(this.dir, {
        sctpCapabilities: this.device.sctpCapabilities,
      }),
      (err) => {
        if (err) {
          this.remoteCreateFailed(err);
        }
      }
    );
    this.cancelRemoteWait();
    const {
      remoteWaitTimeout = TRANSPORT_REMOTE_WAIT_TO,
    } = this.restartControlOptions;
    this.remoteWaitTimer = window.setTimeout(() => {
      this.remoteCreateFailed(new TransportCreateTimeoutError());
    }, remoteWaitTimeout);
  }

  private createEndpointTransport(
    device: ms.Device,
    remoteParams: ms.TransportOptions,
    routerId?: string
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
    transport.on("connect", ({ dtlsParameters }, cb, eb) => {
      this.dispatch(
        new RtcTransportConnectMessage(
          transport.id,
          dtlsParameters,
          transport.appData.routerId
        ),
        (e?: Error | null) => {
          if (e) {
            // TODO check where this error goes:
            // either to the produce/consume call site or to the connectionstatechange handler
            eb(e);
            reportError(e);
          } else {
            cb();
          }
        }
      );
    });
    transport.on(
      "connectionstatechange",
      (connectionState: ms.ConnectionState) =>
        this.onTransportConnectionStateChange(transport, connectionState)
    );
  }

  private onTransportConnectionStateChange(
    transport: ms.Transport<TransportAppData>,
    connectionState: ms.ConnectionState
  ) {
    if (connectionState === "failed") {
      trace(`${TRACE}.onTransportConnectionStateChange`, {
        connectionState,
        dir: this.dir,
        transportId: transport.id,
      });
    }
    switch (connectionState) {
      case "closed":
        this.transportClosed(transport);
        break;
    }
    const isPrimary = this.primaryTransportId === transport.id;
    if (isPrimary) {
      this.restartControl.connectionStateChange(connectionState);
    } else {
      const ice = this.transportsIce.get(transport.id);
      if (ice) {
        ice.connectionStateChange(connectionState);
      }
    }
  }

  private dispatch(m: BaseMessage, cb?: MessageAck) {
    this.conn.dispatch(m.pack(), cb);
  }

  private transportClosed(t: ms.Transport) {
    this.transports.delete(t.id);
  }

  private setPrimaryTransport(transport: ms.Transport) {
    // TODO check
    for (const [r] of this.promises.splice(0, this.promises.length)) {
      r(transport);
    }
  }

  private onTransportCreated(data: RtcTransportCreatedPayload) {
    const { dir, routerId, ...params } = data;
    if (dir !== this.dir) {
      return;
    }
    const isPrimary = !routerId || routerId === this.primaryRouterId;
    if (isPrimary) {
      this.cancelRemoteWait();
    }
    const transportId = data.id;
    const msDevice = this.device;
    if (!msDevice) {
      reportError(new DeviceNotReadyError());
      return;
    }
    if (isPrimary) {
      if (this.checkTransportExists(transportId)) {
        return;
      }
      this.primaryTransportId = transportId;
    }
    try {
      const t = this.createEndpointTransport(msDevice, params, routerId);
      this.created(t, isPrimary);
    } catch (error) {
      if (isPrimary) {
        this.closeRemoteTransport(transportId, this.primaryRouterId);
      }
      // TODO improve app-level error handling
      this.localTransportCreateFailed(error, isPrimary);
    }
  }

  private created(t: ms.Transport, isPrimary: boolean) {
    this.bindTransportListeners(t);
    if (isPrimary) {
      this.restartControl.created();
    } else {
      this.initTransportIceRestart(t);
    }
    this.transports.set(t.id, t);
    this.emitter.emit(RtcTransportConnectorEvents.Created, t);
    if (isPrimary) {
      this.setPrimaryTransport(t);
      this.emitter.emit(RtcTransportConnectorEvents.Ready);
    }
  }

  private localTransportCreateFailed(e: unknown, isPrimary: boolean) {
    const error = new EndpointTransportCreateFailedError(
      e,
      this.dir,
      isPrimary
    );
    reportError(error);
    if (isPrimary) {
      this.restartControl.localCreateFailed();
    }
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

  private closeRemoteTransport(transportId: string, routerId?: string) {
    this.dispatch(new RtcTransportCloseMessage(transportId, routerId));
  }

  private createFailed(error: Error) {
    reportError(error);
    this.restartControl.remoteCreateFailed();
  }

  private bindRestartHandlers() {
    this.restartControl.on(RtcTransportRestartControlEvents.IceRestart, () =>
      this.restartPrimaryTransportIce()
    );
    this.restartControl.on(RtcTransportRestartControlEvents.Start, () =>
      this.doStart()
    );
    this.restartControl.on(RtcTransportRestartControlEvents.Failure, () =>
      this.restartFailed()
    );
  }

  private restartPrimaryTransportIce() {
    if (!this.primaryTransportId) {
      return;
    }
    const t = this.transports.get(this.primaryTransportId);
    if (!t) {
      trace(`${TRACE}.restartPrimaryTransportIce.notReady`);
      return;
    }
    this.restartIce(t);
  }

  private restartIce(transport: ms.Transport<TransportAppData>) {
    this.iceRestarting(transport);
  }

  private iceRestarting(msTransport: ms.Transport<TransportAppData>) {
    const {
      appData: { routerId },
    } = msTransport;
    this.conn.dispatch(
      // TODO timeout by the means of the socket.io
      new RtcIceRestartMessage(msTransport.id, routerId).pack(),
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

  private initTransportIceRestart(transport: ms.Transport<TransportAppData>) {
    if (this.transportsIce.has(transport.id)) {
      trace(`${TRACE}.initTransportIceRestart.alreadyExists`, {
        transportId: transport.id,
      });
      return;
    }
    const ice = new RtcTransportIceRestartControl(
      () => this.iceRestarting(transport),
      () => {} // TODO,
    );
    this.transportsIce.set(transport.id, ice);
  }

  private getTransport(transportId: string): ms.Transport {
    const t = this.transports.get(transportId);
    if (!t) {
      throw new WrongTransportError();
    }
    return t;
  }
}
