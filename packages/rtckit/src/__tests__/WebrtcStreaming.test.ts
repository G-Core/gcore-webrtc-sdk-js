import { beforeEach, describe, expect, it, vi } from "vitest";

import { WebrtcStreaming } from "../WebrtcStreaming.js";

describe("WebrtcStreaming", () => {
  describe("preview", () => {
    let webrtc: WebrtcStreaming;
    let video: HTMLVideoElement;
    beforeEach(async () => {
      webrtc = new WebrtcStreaming("http://localhost:8080/whip/s1");
      const mockStream = createMockMediaStream([
        createMockMediaTrack("audio") as any,
        createMockMediaTrack("video") as any,
      ]);
      window.MediaStream = createMockMediaStream as any;
      // @ts-ignore
      window.navigator.mediaDevices = {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      };

      await webrtc.openSourceStream({
        audio: true,
        video: true,
      });
      video = createMockVideoElement() as any;
      await webrtc.preview(video as any);
    });
    it("should remove audio tracks from the media stream", async () => {
      expect(video.srcObject).not.toBeNull();
      expect((video.srcObject as any).getAudioTracks()).toHaveLength(0);
      expect((video.srcObject as any).getTracks().filter((t) => t.kind === "audio")).toHaveLength(
        0,
      );
      webrtc.close();
    });
  });
});

function createMockVideoElement() {
  return {
    muted: false,
    oncanplay: null,
    oncanplaythrough: null,
    srcObject: null,
    play: vi.fn(),
    pause: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function createMockMediaStream(tracks: MediaStreamTrack[]) {
  const privateTracks = tracks.slice();
  return {
    active: true,
    id: nextStreamId(),
    addTrack: (track: MediaStreamTrack) => privateTracks.push(track),
    clone: vi.fn().mockImplementation(() => createMockMediaStream(privateTracks)),
    getVideoTracks: () => privateTracks.filter((t) => t.kind === "video"),
    getAudioTracks: () => privateTracks.filter((t) => t.kind === "audio"),
    getTracks: () => privateTracks.slice(),
    removeTrack: (track: MediaStreamTrack) => {
      const idx = privateTracks.indexOf(track);
      if (idx !== -1) {
        privateTracks.splice(idx, 1);
      }
    },
  };
}

const nextStreamId = (() => {
  let id = 0;
  return () => `s${id++}`;
})();

const nextTrackId = (() => {
  let id = 0;
  return () => `t${id++}`;
})();

function createMockMediaTrack(kind: "audio" | "video") {
  return {
    kind,
    id: nextTrackId(),
    enabled: true,
    label: `${kind} label`,
    muted: false,
    onended: null,
    onmuted: null,
    readyState: "live",
    applyConstraints: vi.fn(),
    clone: vi.fn().mockImplementation(() => createMockMediaTrack(kind)),
    getCapabilities: vi.fn(),
    getConstraints: vi.fn(),
    stop: vi.fn().mockImplementation(function () {
      this.readyState = "ended";
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}
