import { trace } from "@gcorevideo/utils";

import { SourceStreamControlProtocol, SourceStreamControlProtocolConnector, WebrtcStreamParams } from "./types.js";
import { looseMediaDeviceConstraints } from "./utils.js";
import { MediaKind } from "src/types.js";

const T = 'DefaultSourceStreamControlProtocol';

const REFRESH_MEDIA_DEVICES_DELAY = 1000;

export class DefaultSourceStreamControlProtocol implements SourceStreamControlProtocol {
  private connector: SourceStreamControlProtocolConnector = new NullSSCPConnector();

  openSourceStreamSuccess(s: MediaStream): void {
    trace(`${T} openSourceStreamSuccess`, { stream: s.id });
  }

  async openSourceStreamError(e: Error, constraints: MediaStreamConstraints): Promise<MediaStream> {
    trace(`${T} openSourceStreamError`, { error: e.name, message: e.message, constraints });
    // TODO test this
    // TODO in Firefox it's a MediaStreamError, in Chrome it's a DOMException
    if (e.name === "OverconstrainedError"
      && (
        (constraints.video && typeof constraints.video === "object" && constraints.video.deviceId) ||
        (constraints.audio && typeof constraints.audio === "object" && constraints.audio.deviceId)
      )
      // TODO handle NotFoundError
    ) {
      trace(`${T} openSourceStreamError updateDevicesList`);
      await this.connector.updateDevicesList();
    }
    return Promise.reject(e);
  }

  async reconnectDevices(kinds: Array<MediaKind>, streamParams: WebrtcStreamParams): Promise<MediaStream> {
    trace(`${T} reconnectDevices`, { kinds: Object.keys(kinds).join(), streamParams });
    await this.closeMediaStream();
    await this.refreshMediaDevices();
    const c1 = kinds.includes('video') ? looseMediaDeviceConstraints("video", streamParams) : streamParams;
    const c2 = kinds.includes('audio') ? looseMediaDeviceConstraints("audio", c1) : c1;
    return this.openSourceStream(c2);
  }

  close() {
    // TODO
    trace(`${T} close`);
  }

  connect(connector: SourceStreamControlProtocolConnector) {
    this.connector = connector;
  }

  private closeMediaStream() {
    trace(`${T} closeMediaStream`);
    return this.connector.closeStream();
  }

  private async openSourceStream(params: WebrtcStreamParams): Promise<MediaStream> {
    trace(`${T} openSourceStream`, { params });
    return this.connector.openStream(params);
  }

  private refreshMediaDevices() {
    trace(`${T} refreshMediaDevices`);
    return new Promise<void>((resolve) => {
      setTimeout(resolve, REFRESH_MEDIA_DEVICES_DELAY);
    }).then(() => this.connector.updateDevicesList())
  }
}

class NullSSCPConnector implements SourceStreamControlProtocolConnector {
  async closeStream() { }

  openStream(_: WebrtcStreamParams): Promise<MediaStream> {
    return Promise.reject(new Error("openSourceStream is not implemented"));
  }

  async updateDevicesList(): Promise<void> {
    return Promise.resolve();
  }
}
