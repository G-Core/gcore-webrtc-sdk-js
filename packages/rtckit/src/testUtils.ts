import { MockedObject, vi } from "vitest";

const nextStreamId = (() => {
  let id = 0;
  return () => `s${id++}`;
})();

const nextTrackId = (() => {
  let id = 1;
  return () => `t${id++}`;
})();

export type MockedMediaStreamTrack = MockedObject<MediaStreamTrack>;

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
    onmuted: null,
    addEventListener: vi.fn(),
    applyConstraints: vi.fn(),
    clone: vi.fn().mockImplementation(() => createMockMediaStreamTrack(kind)),
    removeEventListener: vi.fn(),
    getCapabilities: vi.fn(),
    getConstraints: vi.fn(),
    stop: vi.fn().mockImplementation(function () {
      readyState = "ended";
    }),
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
    getVideoTracks: () => privateTracks.filter((t) => t.kind === "video"),
    getAudioTracks: () => privateTracks.filter((t) => t.kind === "audio"),
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

export function setupMockUserMedia(devices: MediaDeviceInfo[] = []) {
  const audioTrack = createMockMediaStreamTrack("audio");
  const videoTrack = createMockMediaStreamTrack("video");
  const mockStream = createMockMediaStream([
    audioTrack as any,
    videoTrack as any,
  ]);
  window.MediaStream = createMockMediaStream as any;
  // @ts-ignore
  window.navigator.mediaDevices = {
    enumerateDevices: vi.fn().mockResolvedValue(devices),
    getUserMedia: vi.fn().mockResolvedValue(mockStream),
  };
  return [mockStream, audioTrack, videoTrack];
}
