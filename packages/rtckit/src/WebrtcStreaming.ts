import { EventEmitter } from "eventemitter3";

import { MediaDevicesHelper, MediaInputDeviceInfo, VideoResolution } from "./MediaDevicesHelper.js";
import { reportError, trace } from "./trace/index.js";
import { MediaKind } from "./types.js";
import { DefaultSourceStreamControlProtocol } from "./userMedia/DefaultSourceStreamControlProtocol.js";
import { SourceStreamControlProtocol, WebrtcStreamParams } from "./userMedia/types.js";
import { closeMediaStream } from "./userMedia/utils.js";
import { WhipClient } from "./whip/WhipClient.js";
import { WhipClientOptions } from "./whip/types.js";

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
  mediaDevicesAutoSwitchRefresh?: boolean; // deprecated (the logic is always enabled)
  mediaDevicesMultiOpen?: boolean; // deprecated (the logic is always enabled)
  /**
   * @beta
   */
  sourceStreamControlProtocol?: SourceStreamControlProtocol;
}

/**
 * @public
 * @remarks
 * - `MediaDeviceSwitch` - selected input media device has been switched to another one after being disconnected.
 *    Payload: {@link MediaDeviceSwitchInfo}
 *
 * - `MediaDeviceSwitchOff` - selected input media device has been disconnected and it was not possible to switch to another one.
 *    Payload: {@link MediaDeviceSwitchOffInfo}
 *
 * - `MediaDeviceSelect` - a new media input device has been selected {@link MediaDeviceSelectInfo}
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

/**
 * @public
 */
export type MediaDeviceSelectInfo = {
  kind: MediaKind;
  device: MediaInputDeviceInfo;
}

/**
 * @public
 */
export type WebrtcStreamingEventTypes = {
  [WebrtcStreamingEvents.MediaDeviceSelect]: [MediaDeviceSelectInfo],
  [WebrtcStreamingEvents.MediaDeviceSwitch]: [MediaDeviceSwitchInfo],
  [WebrtcStreamingEvents.MediaDeviceSwitchOff]: [MediaDeviceSwitchOffInfo],
}

type ReconnectDevicesSchedule = Partial<Record<MediaKind, [resolve: (device: MediaStreamTrack) => void, reject: (e: any) => void]>>;

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
 * await webrtc.openSourceStream({ audio: true, video: true });
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

  private openingStream = false;

  private reconnectDevices: ReconnectDevicesSchedule | null = null;

  private audioEnabled = true;
  private videoEnabled = true;

  private sscp: SourceStreamControlProtocol;

  constructor(private endpoint: string, private options?: WebrtcStreamingOptions) {
    this.sscp = options?.sourceStreamControlProtocol || new DefaultSourceStreamControlProtocol();
    this.sscp.connect({
      closeStream: this.closeMediaStream.bind(this),
      openStream: this.openSourceStream.bind(this),
      updateDevicesList: this.refreshMediaDevices.bind(this),
    })
  }

  close() {
    trace(`${T} close`);
    this.closeWhipClient();
    this.closeMediaStream();
    this.sscp.close();
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
   * @param params - If not specified, will use the default parameters, requesting both audio and video from any devices.
   *    If the parameters are equivalent (e.g., empty) to the parameters used to request the current media stream, the stream is not reopened.
   * @returns  - A promise resolving with a MediaStream object or rejecting with a native browser error.
   * See the description of possible errors on {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#exceptions}
   */
  async openSourceStream(params?: WebrtcStreamParams): Promise<MediaStream> {
    trace(`${T} openSourceStream`, params);
    if (this.mediaStreamPromise) {
      return this.mediaStreamPromise.then(() => this.openSourceStream(params));
    };
    this.mediaStreamPromise = new Promise<MediaStream>((resolve, reject) => {
      if (this.mediaStream) {
        if (!params || sameStreamParams(this.streamParams, params)) {
          trace(`${T} openSourceStream already opened with the same params`);
          return resolve(this.mediaStream);
        }
      }

      if (params) {
        this.streamParams = { ...params };
      }
      this.openingStream = true;

      new Promise<void>((resolve, reject) => {
        if (this.mediaStream) {
          // TODO test that the stream is always closed
          return this.closeMediaStream().then(resolve, reject);
        }
        resolve();
      }).then(() => Promise.all([
        this.mediaDevices.getMicrophones(),
        this.mediaDevices.getCameras(),
      ])).then(([mics, cameras]) => {
        // TODO test deviceId restricted to the current devices list
        const constraints = {
          audio: buildAudioConstraints(this.streamParams, mics),
          video: buildVideoContraints(this.streamParams, cameras, dev => this.mediaDevices.getAvailableVideoResolutions(dev)),
        };
        trace(`${T} openSourceStream built constraints`, { constraints, params: this.streamParams });
        return navigator.mediaDevices.getUserMedia(constraints).catch(e => {
          reportError(e);
          return this.sscp.openSourceStreamError(e, constraints);
        });
      }).then(stream => this.replaceStream(stream).then(
        () => {
          this.emitDeviceSelect(stream);
          this.bindMediaDeviceAutoReconnect(stream);
          this.toggleTracks(stream);
          resolve(stream);
        },
      )).catch(reject)
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

  /**
   * Mutes or unmutes the audio track.
   * A muted audio track will produce silence (at some constant audio level) and send some RTP over the network.
   * @param active  - `true` to unmute the audio, `false` to mute it
   */
  toggleAudio(active: boolean) {
    if (this.audioEnabled === active) {
      return;
    }
    this.audioEnabled = active;
    if (!this.mediaStream) {
      return;
    }
    this.mediaStream.getAudioTracks().forEach((t) => {
      t.enabled = active;
    });
  }

  /**
   * Mutes or unmutes the video track.
   * Muted track will produce black frames and send some RTP over the network.
   *
   * @param active - `true` to unmute the video, `false` to mute it
   */
  toggleVideo(active: boolean) {
    if (this.videoEnabled === active) {
      return;
    }
    this.videoEnabled = active;

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
    trace(`${T} closeMediaStream`, { tracks: this.mediaStream?.getTracks().map(t => t.kind).join() });
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
      if (!this.whipClient) {
        return resolve();
      }
      const client = this.whipClient;
      return Promise.all(
        stream.getTracks().map((track) => client.replaceTrack(track))
      ).then(() => {
        trace(`${T} replaceStream OK`, { client: !!this.whipClient });

        resolve();
      }).catch(reject);
    }).then(() => {
      return this.closeMediaStream(); // TODO drop as it's always closed in the beginning of the openSourceStream
    }).then(() => {
      this.mediaStream = stream;
      this.updateCurrentStreamParams(stream);
    }).catch((e) => {
      closeMediaStream(stream);
      reportError(e);
      return Promise.reject(e);
    });
  }

  private bindMediaDeviceAutoReconnect(stream: MediaStream) {
    trace('bindMediaDeviceAutoReconnect', { autoSwitch: this.options?.mediaDevicesAutoSwitch });
    if (!this.options?.mediaDevicesAutoSwitch) {
      return;
    }
    stream.getTracks().forEach((track) => {
      track.addEventListener("ended", async () => {
        trace(`${T} track ended, auto reconnect`, { kind: track.kind, openingStream: this.openingStream });
        // Safari: previous audio track is forcefully stopped when another one is requested, so we silence this event
        if (this.openingStream) {
          return;
        }
        let prevDevice: MediaInputDeviceInfo | undefined;
        try {
          prevDevice = await this.getDeviceInfo(track);
        } catch (e) {
          reportError(e);
        }
        this.scheduleInputReconnect(track, prevDevice).then(
          (newTrack) => this.getDeviceInfo(newTrack).then(device => {
            trace(`${T} media device auto reconnect OK`, {
              kind: newTrack.kind,
              track: newTrack.id,
              device: formatMediaDevice(device, !!this.options?.debug),
              prevDevice: formatMediaDevice(prevDevice, !!this.options?.debug),
            });
            setTimeout(() => {
              this.emitter.emit(WebrtcStreamingEvents.MediaDeviceSwitch, {
                kind: newTrack.kind as MediaKind,
                device: device,
                prev: prevDevice || NO_DEVICE,
              });
            }, 0);
          })
        ).catch((e: any) => {
          reportError(e);
          setTimeout(() => {
            this.emitter.emit(WebrtcStreamingEvents.MediaDeviceSwitchOff, {
              kind: track.kind as MediaKind,
              device: prevDevice || NO_DEVICE,
            });
          }, 0);
        });
      });
    });
  }

  private async getDeviceInfo(track: MediaStreamTrack): Promise<MediaInputDeviceInfo | undefined> {
    const settings = track.getSettings();
    if (!settings.deviceId) {
      return;
    }
    const devices = await (track.kind === "audio" ? this.mediaDevices.getMicrophones() : this.mediaDevices.getCameras());
    return devices.find((d) => d.deviceId === settings.deviceId);
  }

  private async refreshMediaDevices() {
    trace(`${T} refreshMediaDevices`);
    this.mediaDevices.reset();
    await this.mediaDevices.getMicrophones().then(() => this.mediaDevices.getCameras());
  }

  private async scheduleInputReconnect(track: MediaStreamTrack, prevDevice?: MediaInputDeviceInfo): Promise<MediaStreamTrack> {
    return new Promise<MediaStreamTrack>((resolve, reject) => {
      trace(
        `${T} scheduleInputReconnect enter`,
        {
          kind: track.kind,
          prevDevice: formatMediaDevice(prevDevice, !!this.options?.debug),
          reconnectDevices: this.reconnectDevices ? Object.keys(this.reconnectDevices).join() : "-"
        },
      );
      if (!this.reconnectDevices) {
        const rd: ReconnectDevicesSchedule = {}
        this.reconnectDevices = rd;
        setTimeout(async () => {
          trace(`${T} scheduleInputReconnect run`, { reconnectDevices: Object.keys(rd).join(), streamParams: this.streamParams });
          try {
            const newStream = await this.sscp.reconnectDevices(Object.keys(rd) as Array<MediaKind>, this.streamParams);
            const resolved: Array<() => void> = [];

            for (const [kind, [res]] of Object.entries(rd)) {
              const newTrack = newStream.getTracks().find((t) => t.kind === kind);
              if (!newTrack) {
                throw new Error(`Failed to open ${track.kind} media source`);
              }
              resolved.push(() => res(newTrack));
            }
            for (const r of resolved) {
              setTimeout(r, 0);
            }
          } catch (e) {
            reportError(e);
            for (const [, rej] of Object.values(rd)) {
              setTimeout(() => rej(e), 0);
            }
          } finally {
            this.reconnectDevices = null;
          }
        }, 0);
      }
      this.reconnectDevices[track.kind as MediaKind] = [resolve, reject];
    });
  }

  private updateCurrentStreamParams(stream: MediaStream) {
    if (typeof this.streamParams.audio === "string") {
      const devId = stream.getAudioTracks()[0]?.getSettings().deviceId;
      if (devId && devId !== this.streamParams.audio) {
        this.streamParams.audio = true;
      }
    }
    if (typeof this.streamParams.video === "string") {
      const devId = stream.getVideoTracks()[0]?.getSettings().deviceId;
      if (devId && devId !== this.streamParams.video) {
        this.streamParams.video = true;
      }
    }
  }

  private toggleTracks(stream: MediaStream) {
    if (this.audioEnabled && this.videoEnabled) {
      return;
    }
    stream.getTracks().forEach((t) => {
      switch (t.kind) {
        case "audio":
          t.enabled = this.audioEnabled;
          break;
        case "video":
          t.enabled = this.videoEnabled;
          break;
      }
    });
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

function buildAudioConstraints(params: WebrtcStreamParams, devicesList: MediaInputDeviceInfo[]): boolean | MediaTrackConstraints {
  if (typeof params.audio === "string") {
    const dev = devicesList.find((d) => d.deviceId === params.audio);
    if (!dev) {
      return true; // any device, probably the default one
    }
    return { deviceId: { exact: params.audio } };
  }
  return !!params.audio;
}

function buildVideoContraints(params: WebrtcStreamParams, devicesList: MediaInputDeviceInfo[], rlist: (deviceId: string) => VideoResolution[]): boolean | MediaTrackConstraints {
  if (params.video === false) {
    return false;
  }
  const constraints: MediaTrackConstraints = {};
  if (typeof params.video === "string") {
    const dev = devicesList.find((d) => d.deviceId === params.video);
    if (dev) {
      constraints.deviceId = { exact: params.video };
      if (params.resolution) {
        const items = rlist(params.video);
        const parsed = items.find(item => item.height === params.resolution || item.width === params.resolution);
        if (parsed) {
          const { width, height } = parsed;
          if (width > height) {
            constraints.width = width;
            constraints.height = height;
          } else {
            constraints.width = height;
            constraints.height = width;
          }
        }
      }
    }
  }
  if (params.resolution && !(constraints.width || constraints.height)) {
    // TODO use deviceId to restrict to only that device available resolutions
    const parsed = MediaDevicesHelper.findVideoResolution(params.resolution);
    if (parsed) {
      constraints.width = { ideal: parsed.width };
      constraints.height = { ideal: parsed.height };
    }
  }
  if (!Object.keys(constraints).length) {
    return true;
  }
  return constraints;
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
      const { urls } = s;
      return { urls, username: "***", credential: "***" };
    });
  }
  return opts;
}

function formatMediaDevice(device: MediaInputDeviceInfo | undefined, debug: boolean): string {
  if (!device) {
    return "-";
  }
  return debug ? '***' : device.label || device.deviceId;
}
