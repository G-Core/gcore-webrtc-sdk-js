import { MockedObject, vi } from "vitest";

const nextStreamId = (() => {
  let id = 0;
  return () => `s${id++}`;
})();

const nextTrackId = (() => {
  let id = 1;
  return () => `t${id++}`;
})();

export type MockedMediaStreamTrack = MockedObject<MediaStreamTrack> & {
  dispatchEvent(name: "ended" | "mute" | "unmute"): void;
  triggerEvent(name: "ended" | "mute" | "unmute"): void;
};

export type MockedMediaStream = MockedObject<MediaStream>;

type MediaStreamTrackProps = {
  label: string;
  kind: "audio" | "video";
  muted: boolean;
  enabled: boolean;
  readyState: "live" | "ended";
};

export function createMockMediaStreamTrack(
  kind: "audio" | "video",
  id = nextTrackId(),
  props: Partial<MediaStreamTrackProps> = {}
): MockedMediaStreamTrack {
  let readyState = "live";
  const track: MockedMediaStreamTrack = {
    contentHint: "",
    label: `Built-in ${kind} device`,
    muted: false,
    enabled: true,
    get readyState() {
      return readyState
    },
    ...props,
    id,
    kind,
    onended: null,
    onmute: null,
    onunmute: null,
    addEventListener: vi.fn(),
    applyConstraints: vi.fn(),
    clone: vi.fn().mockImplementation(() => createMockMediaStreamTrack(kind)),
    getCapabilities: vi.fn(),
    getConstraints: vi.fn(),
    getSettings: vi.fn().mockReturnValue({ deviceId: "default"}),
    removeEventListener: vi.fn(),
    stop: vi.fn().mockImplementation(function () {
      readyState = "ended";
    }),
    dispatchEvent(name: "ended" | "mute" | "unmute") {
      const handler = this[`on${name}`];
      const event = new CustomEvent(name);
      if (handler)  {
        try {
          handler.call(this, event);
        } catch (e) {
          console.error(e);
        }
      }
      this.addEventListener.mock.calls.forEach(([eventName, cb]: [string, Function]) => {
        if (eventName === name) {
          try {
            cb.call(this, event);
          } catch (e) {
            console.error(e);
          }
        }
      });
    }
  } as any;
  track.clone.mockImplementation(() => {
    const {
      enabled,
      label,
      muted,
      readyState,
    } = track;
    return createMockMediaStreamTrack(kind, undefined, {
      enabled,
      label,
      muted,
      readyState,
    });
  });
  return track;
}

export function createMockMediaStream(tracks: MediaStreamTrack[]) {
  const privateTracks = tracks.slice();
  return {
    active: true,
    id: nextStreamId(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addTrack: (track: MediaStreamTrack) => privateTracks.push(track),
    clone: vi.fn().mockImplementation(() => createMockMediaStream(privateTracks)),
    dispatchEvent: vi.fn(),
    getAudioTracks: () => privateTracks.filter((t) => t.kind === "audio"),
    getVideoTracks: () => privateTracks.filter((t) => t.kind === "video"),
    getTrackById(id: string) {
      return privateTracks.find((t) => t.id === id) || null;
    },
    getTracks: () => privateTracks.slice(),
    onaddtrack: null,
    onremovetrack: null,

    removeTrack: (track: MediaStreamTrack) => {
      const idx = privateTracks.indexOf(track);
      if (idx !== -1) {
        privateTracks.splice(idx, 1);
      }
    },
  };
}

export function setupDefaultMockUserMedia(devices: MediaDeviceInfo[] = []) {
  const audioTrack = createMockMediaStreamTrack("audio");
  const videoTrack = createMockMediaStreamTrack("video");
  const mockStream = createMockMediaStream([
    audioTrack as any,
    videoTrack as any,
  ]);
  setupMockMediaDevices(devices);
  // @ts-ignore
  window.navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockStream);
  return [mockStream, audioTrack, videoTrack];
}

export function setupMockMediaDevices(devices: MediaDeviceInfo[]): MockedObject<MediaDevices> {
  window.MediaStream = createMockMediaStream as any;
  const md = {
    enumerateDevices: vi.fn().mockResolvedValue(devices),
    getUserMedia: vi.fn(),
  }
  // @ts-ignore
  window.navigator.mediaDevices = md;
  // @ts-ignore
  return md;
}

export function setupDefaultGetUserMedia(constraints: GetUserMediaContraints) {
  // @ts-ignore
  window.navigator.mediaDevices.getUserMedia.mockImplementation(() => {
    const tracks: MockedMediaStreamTrack[] = [];
    if (constraints.audio) {
      tracks.push(createMockMediaStreamTrack("audio"));
    }
    if (constraints.video) {
      tracks.push(createMockMediaStreamTrack("video"));
    }
    const mockStream = createMockMediaStream(tracks);
    return Promise.resolve(mockStream);
  });
}

type GetUserMediaContraints = {
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
}

export function setupGetUserMedia(constraints: GetUserMediaContraints): MockedMediaStreamTrack[] {
  const tracks: MockedMediaStreamTrack[] = [];
  if (constraints.audio) {
    tracks.push(createMockMediaStreamTrack("audio"));
  }
  if (constraints.video) {
    tracks.push(createMockMediaStreamTrack("video"));
  }
  const mockStream = createMockMediaStream(tracks);
  // @ts-ignore
  globalThis.navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(mockStream);
  return tracks;
}

export function MockRTCPeerConnection(configuration: RTCConfiguration = {}) {
  const retval = {
    configuration,
    localDescription: null,
    remoteDescription: null,
    onicecandidate: null,

    addTrack: vi.fn(),
    addTransceiver: vi.fn(),
    createAnswer: vi.fn().mockReturnValue({
      sdp: "v=0\r\n",
      type: "answer",
    }),
    close: vi.fn(),
    createOffer: vi.fn().mockReturnValue({
      sdp: "v=0\r\n",
      type: "offer",
    }),
    dispatchEvent(name: string, detail: any) {
      switch (name) {
        case "icecandidate":
          if (this.onicecandidate) {
            (this.onicecandidate as Function)(detail);
          }
          break;
      }
    },
    generateCertificate: vi.fn().mockImplementation(() => {
      return Promise.reject(new Error("Not implemented"));
    }),
    getConfiguration() {
      return this.configuration;
    },
    getSenders: vi.fn().mockReturnValue([]),
    getTransceivers: vi.fn().mockReturnValue([]),
    setConfiguration: vi.fn().mockImplementation(function (this: any, config: RTCConfiguration) {
      this.configuration = config;
    }),
    setLocalDescription(ld: any) {
      this.localDescription = ld
    },
    setRemoteDescription: vi.fn().mockImplementation(function (this: any, rd: any) {
      this.remoteDescription = rd;
    }),
  };
  // @ts-ignore
  Object.assign(this, retval);
}

export function setupVideoResolutionProbes() {
  // 5 standard video resolutions 240..1080
  for (let i = 0; i < 5; i++) {
    setupGetUserMedia({ video: true})
  }
}

export class MockOverconstrainedError extends Error {
  constructor(public readonly constraint: string) {
    super(`Constraints could not be satisfied.`);
    this.name = "OverconstrainedError";
  }
}
