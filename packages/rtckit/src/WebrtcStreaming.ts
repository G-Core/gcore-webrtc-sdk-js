import { MediaDevicesHelper, MediaInputDeviceInfo } from "./MediaDevices.js";
import { MediaKind } from "./stats/types.js";
import { reportError, trace } from "./trace/index.js";
import { WhipClient } from "./whip/WhipClient.js";
import { WhipClientOptions } from "./whip/types.js";
import { EventEmitter } from "eventemitter3";

/**
 * @public
 */
export type DeviceId = string;

// TODO trace sensitive data only when debug is enabled

/**
 * @public
 */
export type WebrtcStreamParams = {
  audio?: boolean | DeviceId;
  video?: boolean | DeviceId;
  resolution?: number;
};

const NO_DEVICE: MediaInputDeviceInfo = Object.freeze({
  deviceId: "",
  label: "",
  groupId: "",
});

/**
 * @public
 *
 * WebRTC streaming configuration options. See also {@link WhipClientOptions}
 *
 * @remarks
 *
 * - `mediaDevicesAutoSwitch` - enable automatic switching to another media device when the current one is disconnected.
 *
 *  When a media device disconnect is detected, the client will attempt to reaqcuire the stream with the same constraints but 
 *  requesting any available device of that kind. If that succeeds, the client will replace the currently sent media tracks
 *  with those from the new stream. It will then emit a {@link WebrtcStreamingEvents.MediaDeviceSwitch} event, containing the
 *  information about the previous and new media devices. The application code should then reflect the changes in the UI,
 *  probably prompting the user to check the list of the available devices and switch to the desired one.
 *
 *  If any of the steps fail, the client will emit a {@link WebrtcStreamingEvents.MediaDeviceSwitchOff} event. The event will
 *  contain the information about the disconnected media device.
 *
 *  NOTE. In the case of a camera device, it can happen that the new device will have different resolutions supported.
 *  One way to avoid this is to always specify one of the standard resolutions in the {@link WebrtcStreamParams | video constraints}.
 *  See also {@link WebrtcStreaming.openSourceStream}, {@link MediaDevicesHelper.getAvailableVideoResolutions}
 */
export type WebrtcStreamingOptions = WhipClientOptions & {
  mediaDevicesAutoSwitch?: boolean;
}

/**
 * @public
 * @remarks
 * - `MediaDeviceSwitch` - selected input media device has been switched to another one after being disconnected.
 *    Payload: {@link MediaDeviceSwitchInfo}
 *
 * - `MediaDeviceSwitchOff` - selected input media device has been disconnected and it was not possible to switch to another one.
 *    Payload: {@link MediaDeviceSwitchOffInfo}
 */
export enum WebrtcStreamingEvents {
  MediaDeviceSelect = "mdselect",
  MediaDeviceSwitch = "mdswitch",
  MediaDeviceSwitchOff = "mdswitchoff",
}

/**
 * @public
 * @remarks
 * 
 * - `kind` - media input kind of the device
 *
 * - `prev` - previous media input device info
 *
 * - `device` - new media input device info
 */
export type MediaDeviceSwitchInfo = {
  kind: MediaKind;
  prev: MediaInputDeviceInfo;
  device: MediaInputDeviceInfo;
}

/**
 * @public
 * 
 * @remarks
 * 
 * - `kind` - media input kind of the device
 *
 * - `device` - disconnected media input device info
 */
export type MediaDeviceSwitchOffInfo = {
  kind: MediaKind;
  device: MediaInputDeviceInfo;
}

export type MediaDeviceSelectInfo = {
  kind: MediaKind;
  device: MediaInputDeviceInfo;
}

export type WebrtcStreamingEventTypes = {
  [WebrtcStreamingEvents.MediaDeviceSelect]: [MediaDeviceSelectInfo],
  [WebrtcStreamingEvents.MediaDeviceSwitch]: [MediaDeviceSwitchInfo],
  [WebrtcStreamingEvents.MediaDeviceSwitchOff]: [MediaDeviceSwitchOffInfo],
}

const DEFAULT_STREAM_PARAMS = Object.freeze({
  audio: true,
  video: true,
});

const T = "WebrtcStreaming";

/**
 * A wrapper around WhipClient to facilitate creating WebRTC streams in a browser
 * @public
 * @example
 * ```typescript
 * const webrtc = new WebrtcStreaming('https://example.com/whip/0aeb');
 * await webrtc.openSourceStream();
 * await webrtc.preview(document.querySelector('video'));
 * await webrtc.run();
 * webrtc.toggleVideo(false);
 * ...
 * webrtc.close();
 * ```
 */
export class WebrtcStreaming {
  public readonly mediaDevices = new MediaDevicesHelper();

  private emitter = new EventEmitter<WebrtcStreamingEvents>();

  private mediaStream: MediaStream | null = null;

  private mediaStreamPromise: Promise<MediaStream> | null = null;

  private streamParams: WebrtcStreamParams = DEFAULT_STREAM_PARAMS;

  private whipClient: WhipClient | null = null;

  private hotReplace = true;

  private openingStream = false;

  constructor(private endpoint: string, private options?: WebrtcStreamingOptions) { }

  close() {
    trace(`${T} close`);
    this.closeWhipClient();
    this.closeMediaStream();
  }

  configure(endpoint: string, options?: WebrtcStreamingOptions) {
    trace(`${T} configure`, {
      endpoint: options?.debug ? endpoint : maskEndpoint(endpoint),
      options: maskOptions(options)
    });
    this.endpoint = endpoint;
    if (options) {
      this.options = options;
    }
  }

  off<E extends WebrtcStreamingEvents>(event: E, handler: (...args: WebrtcStreamingEventTypes[E]) => void) {
    this.emitter.off(event, handler);
  }

  on<E extends WebrtcStreamingEvents>(event: E, handler: (...args: WebrtcStreamingEventTypes[E]) => void) {
    this.emitter.on(event, handler);
  }

  /**
   * 
   * @param params - If not specified, will use the default parameters, requesting both audio and video from any devices
   * @returns 
   */
  async openSourceStream(params?: WebrtcStreamParams): Promise<MediaStream> {
    trace(`${T} openSourceStream`, this.options?.debug ? params : maskStreamingParams(params));
    if (this.mediaStreamPromise) {
      return this.mediaStreamPromise.then(() => this.openSourceStream(params));
    };
    this.mediaStreamPromise = new Promise<MediaStream>((resolve, reject) => {
      if (this.mediaStream) {
        if (!params || sameStreamParams(this.streamParams, params)) {
          return resolve(this.mediaStream);
        }
        if (!this.hotReplace || !this.whipClient) {
          this.closeMediaStream();
        }
      }

      if (params) {
        this.streamParams = { ...params };
      }

      const constraints: MediaStreamConstraints = {
        audio: buildAudioConstraints(this.streamParams),
        video: buildVideoContraints(this.streamParams),
      };
      this.openingStream = true;
      // Ensure the devices list is updated, it's managed to be only done once by the MediaDeviceHelper
      this.mediaDevices.getCameras()
        .then(() => navigator.mediaDevices.getUserMedia(constraints))
        .then(stream => this.replaceStream(stream).then(
          () => {
            this.emitDeviceSelect(stream);
            this.bindMediaDeviceAutoReconnect(stream);
            resolve(stream);
          },
        ))
        .catch(reject)
    }).finally(() => {
      this.mediaStreamPromise = null;
      this.openingStream = false;
    });
    return this.mediaStreamPromise;
  }

  private emitDeviceSelect(stream: MediaStream) {
    stream.getTracks().forEach((t) => {
      this.getDeviceInfo(t).then(device => {
        this.emitter.emit(WebrtcStreamingEvents.MediaDeviceSelect, {
          kind: t.kind as MediaKind,
          device: device || NO_DEVICE,
        });
      });
    });
  }

  async preview(targetNode: HTMLVideoElement) {
    trace(`${T} preview`);
    const srcStream = await this.openSourceStream();
    const videoTrack = srcStream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error("No video track in the source stream");
    }
    if (targetNode.srcObject && targetNode.srcObject instanceof MediaStream) {
      const t = targetNode.srcObject.getVideoTracks()[0];
      if (t && t.id === videoTrack.id) {
        trace(`${T} preview already playing the same stream`);
        return;
      }
    }
    const previewStream = new MediaStream([videoTrack]);
    targetNode.srcObject = previewStream;
    targetNode.play();
  }

  async run(): Promise<WhipClient> {
    trace(`${T} run`);
    if (!this.endpoint) {
      throw new Error("Endpoint is not set");
    }
    if (this.whipClient) {
      this.closeWhipClient();
    }
    const mediaStream = await this.openSourceStream();
    const opts = {
      videoCodecs: ["H264"],
      ...this.options,
      iceServers: this.options?.iceServers?.flatMap(({ urls, username, credential }) => {
        if (Array.isArray(urls)) {
          return urls.map((url) => ({ urls: url, username, credential }));
        }
        return {
          urls,
          username,
          credential,
        };
      }),
    };
    const whipClient = new WhipClient(this.endpoint, opts);
    this.whipClient = whipClient;
    await whipClient.start(mediaStream);
    return whipClient;
  }

  toggleAudio(active: boolean) {
    if (!this.mediaStream) {
      return;
    }
    this.mediaStream.getAudioTracks().forEach((t) => {
      t.enabled = active;
    });
  }

  toggleVideo(active: boolean) {
    if (!this.mediaStream) {
      return;
    }
    this.mediaStream.getVideoTracks().forEach((t) => {
      t.enabled = active;
    });
  }

  private async closeWhipClient() {
    trace(`${T} closeWhipClient`, { exists: !!this.whipClient });
    if (this.whipClient) {
      await this.whipClient.close();
      this.whipClient = null;
    }
  }

  private async closeMediaStream() {
    trace(`${T} closeMediaStream`, { exists: !!this.mediaStream });
    if (!this.mediaStream) {
      return;
    }
    const mediaStream = this.mediaStream;
    if (this.whipClient) {
      const whip = this.whipClient;
      for (const t of mediaStream.getTracks()) {
        await whip.removeTrack(t);
      };
    }
    closeMediaStream(mediaStream);
    this.mediaStream = null;
  }

  private async replaceStream(stream: MediaStream) {
    trace(`${T} replaceStream`, { client: !!this.whipClient });
    return new Promise<void>((resolve, reject) => {
      if (!(this.whipClient && this.hotReplace)) {
        return resolve();
      }
      const client = this.whipClient;
      return Promise.all(stream.getTracks().map((track) => client.replaceTrack(track)))
        .then(() => {
          trace(`${T} replaceStream OK`, { client: !!this.whipClient });
        })
        .then(() => {
          this.bindMediaDeviceAutoReconnect(stream);
          resolve();
        })
        .catch(reject);
    }).then(() => {
      return this.closeMediaStream();
    }).then(() => {
      this.mediaStream = stream;
    }).catch((e) => {
      closeMediaStream(stream);
      reportError(e);
      return Promise.reject(e);
    });
  }

  private bindMediaDeviceAutoReconnect(stream: MediaStream) {
    if (!this.options?.mediaDevicesAutoSwitch) {
      return;
    }
    stream.getTracks().forEach((track) => {
      track.addEventListener("ended", async () => {
        // Safari: previous audio track is forcefully stopped when another one is requested, so we silence this event
        trace(`${T} media device auto reconnect`, { kind: track.kind, openingStream: true });
        if (this.openingStream && track.kind === "audio") {
          return;
        }
        let prevDevice: MediaInputDeviceInfo | undefined;
        try {
          prevDevice = await this.getDeviceInfo(track);
        } catch (e) {
          reportError(e);
        }
        try {
          await this.closeMediaStream();
          const newStream = await this.openSourceStream(looseMediaDeviceConstraints(track.kind as MediaKind, this.streamParams))
          const newTrack = newStream.getTracks().find((t) => t.kind === track.kind);
          const device = await (newTrack ? this.getDeviceInfo(newTrack) : Promise.resolve(undefined));
          trace(`${T} media device auto reconnect OK`, {
            kind: track.kind,
            device: this.options?.debug ? device?.label : (device ? "***" : "-"),
            prevDevice: prevDevice?.label ? device?.label : (prevDevice ? "***" : "-"),
          });
          try {
            this.emitter.emit(WebrtcStreamingEvents.MediaDeviceSwitch, {
              kind: track.kind as MediaKind,
              device: device || NO_DEVICE,
              prev: prevDevice || NO_DEVICE,
            });
          } catch (e) {
            reportError(e);
          }
        } catch (e) {
          reportError(e);
          this.emitter.emit(WebrtcStreamingEvents.MediaDeviceSwitchOff, {
            kind: track.kind as MediaKind,
            device: prevDevice || NO_DEVICE,
          });
        }
      });
    });
  }

  // TODO reject if not found?
  private async getDeviceInfo(track: MediaStreamTrack): Promise<MediaInputDeviceInfo | undefined> {
    const settings = track.getSettings();
    if (!settings.deviceId) {
      return;
    }
    const devices = await (track.kind === "audio" ? this.mediaDevices.getMicrophones() : this.mediaDevices.getCameras());
    return devices.find((d) => d.deviceId === settings.deviceId);
  }
}

function sameStreamParams(a: WebrtcStreamParams, b: WebrtcStreamParams): boolean {
  if (!(a.audio === b.audio || (a.audio && b.audio === true))) {
    return false;
  }
  if (!(a.video === b.video || (a.video && b.video === true))) {
    return false;
  }
  if (b.resolution && a.resolution !== b.resolution) {
    return false;
  }
  return true;
}

function buildAudioConstraints(params: WebrtcStreamParams): boolean | MediaTrackConstraints {
  if (typeof params.audio === "string") {
    return { deviceId: { exact: params.audio } };
  }
  return !!params.audio;
}

function buildVideoContraints(params: WebrtcStreamParams): boolean | MediaTrackConstraints {
  if (params.video === false) {
    return false;
  }
  const constraints: MediaTrackConstraints = {};
  if (typeof params.video === "string") {
    constraints.deviceId = { exact: params.video };
  }
  if (params.resolution) {
    const parsed = MediaDevicesHelper.findVideoResolution(params.resolution);
    if (parsed) {
      constraints.width = { ideal: parsed.width };
      constraints.height = { ideal: parsed.height };
    }
  }
  return constraints;
}

function closeMediaStream(stream: MediaStream) {
  stream.getTracks().forEach((t) => {
    t.stop();
    stream.removeTrack(t);
  });
}

function looseMediaDeviceConstraints(kind: MediaKind, params: WebrtcStreamParams): WebrtcStreamParams {
  if (kind === "audio") {
    return { ...params, audio: true };
  }
  return { ...params, video: true };
}

function maskEndpoint(endpoint: string): string {
  const u = new URL(endpoint);
  return `${u.origin}/${u.pathname.split('/')[1].split('_')[0]}`;
}

function maskOptions(options?: WebrtcStreamingOptions): Record<string, unknown> | undefined {
  if (!options) {
    return;
  }
  const { auth, iceServers, ...opts } = options;
  const masked = { ...options };
  if (options.auth) {
    masked.auth = "***";
  }
  if (options.iceServers && options.iceServers.length) {
    masked.iceServers = options.iceServers.map((s) => {
      const { urls, username, credential } = s;
      return { urls, username: "***", credential: "***" };
    });
  }
  return opts;
}

function maskStreamingParams(params?: WebrtcStreamParams): Record<string, unknown> | undefined {
  return {
    ...params,
    audio: typeof params?.audio === "string" ? "deviceId" : params?.audio,
    video: typeof params?.video === "string" ? "deviceId" : params?.video,
  };
}
