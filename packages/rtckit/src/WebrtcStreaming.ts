import { MediaDevicesHelper } from "./MediaDevices.js";
import { trace } from "./trace/index.js";
import { WhipClient } from "./whip/WhipClient.js";
import { WhipClientOptions } from "./whip/types.js";

/**
 * @public
 */
export type DeviceId = string;

/**
 * @public
 */
export type WebrtcStreamParams = {
  audio?: boolean | DeviceId;
  video?: boolean | DeviceId;
  resolution?: number;
};

/**
 * @public
 * WebRTC streaming configuration options. @see WhipClientOptions
 * @remarks
 * - `hotReplace` - replace the outgoing stream immediately when the source stream changes
 */
export type WebrtcStreamingOptions = WhipClientOptions & {
  hotReplace?: boolean;
}

const DEFAULT_STREAM_PARAMS = {
  audio: true,
  video: true,
};

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

  private mediaStream: MediaStream | null = null;

  private mediaStreamPromise: Promise<MediaStream> | null = null;

  private streamParams: WebrtcStreamParams = DEFAULT_STREAM_PARAMS;

  private whipClient: WhipClient | null = null;

  private get hotReplace() {
    return this.options?.hotReplace || false;
  }

  constructor(private endpoint: string, private options?: WebrtcStreamingOptions) { }

  close() {
    trace(`${T} close`);
    this.closeWhipClient();
    this.closeMediaStream();
  }

  configure(endpoint: string, options?: WebrtcStreamingOptions) {
    trace(`${T} configure`, { endpoint, options });
    this.endpoint = endpoint;
    if (options) {
      this.options = options;
    }
  }

  async openSourceStream(params?: WebrtcStreamParams): Promise<MediaStream> {
    trace(`${T} openSourceStream`, params);
    if (this.mediaStreamPromise) {
      return this.mediaStreamPromise.then(() => this.openSourceStream(params));
    };
    this.mediaStreamPromise = new Promise<MediaStream>((resolve, reject) => {
      if (this.mediaStream) {
        if (!params || sameStreamParams(this.streamParams, params)) {
          return resolve(this.mediaStream);
        }
        // TODO check this point below:
        // In Safari it isn't possible to have two live streams at the same time
        if (!this.hotReplace || !this.whipClient) {
          this.closeMediaStream();
        }
      }
      this.streamParams = params ? { ...params } : DEFAULT_STREAM_PARAMS;
      const constraints: MediaStreamConstraints = {
        audio: buildAudioConstraints(this.streamParams),
        video: buildVideoContraints(this.streamParams),
      };
      navigator.mediaDevices.getUserMedia(constraints).then(stream => {
        this.replaceStream(stream).then(() => resolve(stream), reject);
      }, reject)
    }).finally(() => {
      this.mediaStreamPromise = null;
    });
    return this.mediaStreamPromise;
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
      ...(this.options || {}),
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
    trace(`${T} replaceStream`, { hotReplace: this.hotReplace, client: !!this.whipClient });
    return new Promise<void>((resolve, reject) => {
      if (!(this.whipClient && this.hotReplace)) {
        return resolve();
      }
      const client = this.whipClient;
      Promise.all(stream.getTracks().map((track) => client.replaceTrack(track)))
        .then(() => {
          trace(`${T} replaceStream OK`, { hotReplace: this.hotReplace, client: !!this.whipClient });
        })
        .then(resolve, reject);
    }).then(() => {
      return this.closeMediaStream();
    }).then(() => {
      this.mediaStream = stream;
    }).catch((e) => {
      closeMediaStream(stream);
      reportError(e);
      // TODO emit a notification event
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
