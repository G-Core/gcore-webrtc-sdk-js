import { MockedObject, beforeEach, describe, expect, it, vi } from "vitest";

import { WebrtcStreaming } from "../WebrtcStreaming.js";

import {WhipClient} from "../whip/WhipClient.js";

import { setupDefaultMockUserMedia, setupGetUserMedia, setupMockUserMedia } from "../testUtils.js";

vi.mock("../whip/WhipClient.js", () => ({
  WhipClient: vi.fn(),
}));

describe("WebrtcStreaming", () => {
  let webrtc: WebrtcStreaming;
  describe("preview", () => {
    let video: HTMLVideoElement;
    beforeEach(async () => {
      webrtc = new WebrtcStreaming("http://localhost:8080/whip/s1");
      setupDefaultMockUserMedia()
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
  describe("openSourceStream", () => {
    describe("open twice", () => {
      describe.each([
        [
          {
            audio: true,
            video: true,
          },
          {
            audio: true,
            video: true,
            resolution: 1080,
          },
          {
            audio: true,
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          }
        ],
        [
          {
            audio: true,
            video: true,
          },
          {
            audio: true,
            video: "camera1",
          },
          {
            audio: true,
            video: {
              deviceId: {
                exact: "camera1",
              }
            },
          }
        ],
        [
          {
            audio: true,
            video: true,
          },
          {
            audio: true,
            video: true,
          },
          undefined,
        ],
        [
          {
            audio: "mic1",
            video: true,
          },
          {
            audio: true,
            video: true,
          },
          undefined,
        ],
        [
          {
            audio: true,
            video: true,
            resolution: 1080,
          },
          {
            audio: true,
            video: true,
          },
          undefined,
        ],
      ])("", (firstParams, secondParams, expectedConstraints) => {
        beforeEach(async () => {
          webrtc = new WebrtcStreaming("http://localhost:8080/whip/s1");
          setupDefaultMockUserMedia();
          setupGetUserMedia({ audio: true, video: true})
          await webrtc.openSourceStream(firstParams);
          await webrtc.openSourceStream(secondParams);
        });
        if (expectedConstraints) {
          it("should call getUserMedia second time with the new constraints", () => {
            expect(window.navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
            expect(window.navigator.mediaDevices.getUserMedia).toHaveBeenNthCalledWith(2, expectedConstraints);
          });
        } else {
          it("should not call getUserMedia second time", () => {
            expect(window.navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
          });
        }
      });
    });
    describe("hot track replacement", () => {
      describe("when the audio track is toggled off", () => {
        let firstTimeTracks: MediaStreamTrack[];
        let mockWhipClient: MockedWhipClient;
        beforeEach(() => {
          webrtc = new WebrtcStreaming("http://localhost:8080/whip/s1");
          setupMockUserMedia([]);
          firstTimeTracks = setupGetUserMedia({ audio: true, video: true });
          setupGetUserMedia({ audio: false, video: true });
          mockWhipClient = createMockWhipClient();
          // @ts-ignore
          WhipClient.mockReturnValueOnce(mockWhipClient);
        });
        it("should gracefully remove current audio track", async () => {
          await webrtc.openSourceStream({
            audio: true,
            video: true,
          });
          await webrtc.run();
          await webrtc.openSourceStream({
            audio: false,
            video: true,
          });

          firstTimeTracks.forEach((t) => {
            expect(mockWhipClient.removeTrack).toHaveBeenCalledWith(t);
          });
        });
      });
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

// TODO use WhipClient interface instead
type MockedWhipClient = MockedObject<WhipClient>;

function createMockWhipClient(): MockedWhipClient {
  return {
    close: vi.fn(),
    on: vi.fn(),
    restart: vi.fn(),
    removeTrack: vi.fn(),
    replaceTrack: vi.fn(),
    start: vi.fn(),
  } as MockedWhipClient;
}
