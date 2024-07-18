import { Device, types as ms } from "mediasoup-client";
import { EventEmitter } from "eventemitter3";

import { SignalConnection } from "../signaling/types.js";
import { reportError, trace } from "../trace/index.js";

import {
  MessageDto as M,
  MessageType,
  RtcRouterCapsPayload,
} from "../msg/types.js";
import {
  DeviceInitFailedError
} from "./errors.js";
import { RtcEndpointCapsMessage } from "../msg/RtcEndpointCapsMessage.js";
import type { RtcEndpointOptions } from "../types.js";

const TRACE = "lib.rtckit.internal.RtcRouterConnector";

/**
 * @internal
 */
export enum RtcRouterConnectorEvents {
  DeviceReady = "deviceReady",
  Failure = "failure",
}


/**
 * @internal
 */
export class RtcRouterConnector {
  private devices: Record<string, ms.Device> = {};

  private emitter = new EventEmitter();

  private options: RtcEndpointOptions = {}

  private primaryRouterId?: string;

  on = this.emitter.on.bind(this.emitter);

  off = this.emitter.off.bind(this.emitter);

  constructor(private conn: SignalConnection) {
    conn.subscribe((m: M) => this.handleMessage(m));
  }

  get ready() {
    return this.primaryRouterId !== undefined;
  }

  close() {
    this.reset();
    this.emitter.removeAllListeners();
  }

  reset() {
    this.devices = {};
    this.primaryRouterId = undefined;
  }

  setEndpointOptions(options: RtcEndpointOptions) {
    this.options = options;
  }

  private handleMessage(m: M) {
    switch (m.type) {
      case MessageType.RtcRouterCaps:
        this.onRouterCaps(m.data as RtcRouterCapsPayload);
        break;
      default:
        break;
    }
  }

  private onRouterCaps(data: RtcRouterCapsPayload) {
    const { routerId = "", rtpCapabilities } = data;
    // TODO use single device for all routers
    const device = this.getDevice(routerId);
    if (device.loaded) {
      trace(`${TRACE}.onRouterCaps.alreadyLoaded`, { routerId });
      this.deviceReady(routerId, device);
      return;
    }
    device
      .load({
        routerRtpCapabilities: this.filterRtpCaps(rtpCapabilities),
      })
      .then(
        () => this.deviceReady(routerId, device),
        (e) => {
          const error = new DeviceInitFailedError(routerId, e);
          this.deviceLoadFailed(error);
        }
      );
  }

  private deviceReady(routerId: string, device: ms.Device) {
    if (this.primaryRouterId === undefined) {
      this.primaryRouterId = routerId;
    }
    this.sendEndpointCaps(device);
    this.emitter.emit(RtcRouterConnectorEvents.DeviceReady, {
      device,
      primary: this.primaryRouterId === routerId,
      routerId,
    });
  }

  // TODO test
  private filterRtpCaps(rtpCaps: ms.RtpCapabilities): ms.RtpCapabilities {
    const codecs = rtpCaps.codecs ? this.filterCodecs(rtpCaps.codecs) : undefined;
    const headerExtensions = rtpCaps.headerExtensions ? this.filterHeaderExtensions(rtpCaps.headerExtensions): undefined;
    return {
      ...rtpCaps,
      codecs,
      headerExtensions,
    };
  }

  private filterCodecs(codecs: ms.RtpCodecCapability[]): ms.RtpCodecCapability[] {
    if (!this.options.codecs) {
      return codecs;
    }
    return codecs.filter(this.options.codecs);
  }

  private filterHeaderExtensions(
    headerExtensions: ms.RtpHeaderExtension[]
  ): ms.RtpHeaderExtension[] {
    if (!this.options.headerExtensions) {
      return headerExtensions;
    }
    return headerExtensions.filter(this.options.headerExtensions);
  }

  private sendEndpointCaps(device: ms.Device) {
    this.conn.dispatch(
      new RtcEndpointCapsMessage(
        device.rtpCapabilities,
        device.sctpCapabilities
      ).pack()
    );
  }

  private getDevice(routerId: string): ms.Device {
    if (!this.devices[routerId]) {
      this.devices[routerId] = new Device();
    }
    return this.devices[routerId];
  }

  private deviceLoadFailed(e: Error) {
    reportError(e);
    this.emitter.emit(RtcRouterConnectorEvents.Failure, e);
  }
}
