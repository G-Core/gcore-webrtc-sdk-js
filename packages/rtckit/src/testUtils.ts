import { MockedObject, vi } from "vitest";

const nextTrackId = (function () {
  let nextId = 1;
  return () => `track${nextId++}`;
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
  const track: MockedMediaStreamTrack = {
    label: `Built-in ${kind} device`,
    muted: false,
    enabled: true,
    readyState: "live",
    ...props,
    id,
    kind,
    onended: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    clone: vi.fn(),
    stop: vi.fn(),
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

const nextId = function () {
  let counter = 1;
  return function () {
    return `${counter++}`;
  };
}();

export function createMockMediaStream(id = nextId()): MockedMediaStream {
  return {
    id,
    addTrack: vi.fn(),
    getAudioTracks: vi.fn().mockReturnValue([]),
    getTracks: vi.fn().mockReturnValue([]),
    getVideoTracks: vi.fn().mockReturnValue([]),
    removeTrack: vi.fn(),
  } as any;
}
