import { MockedFunction, MockedObject, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as FakeTimers from "@sinonjs/fake-timers";

import { MediaDevicePlugInfo, MediaDeviceUnplugInfo, WebrtcStreaming, WebrtcStreamingEvents } from "../WebrtcStreaming.js";

import { WhipClient } from "../whip/WhipClient.js";

import { Logger } from "../Logger.js";
import { LogTracer } from "../trace/LogTracer.js";
import { setTracer } from "../trace/index.js";
import {
  MockedMediaStreamTrack,
  setupDefaultGetUserMedia,
  setupDefaultMockUserMedia,
  setupGetUserMedia,
  setupMockMediaDevices
} from "../testUtils.js";

Logger.enable("*");
setTracer(new LogTracer());

vi.mock("../whip/WhipClient.js", () => ({
  WhipClient: vi.fn(),
}));

describe("WebrtcStreaming", () => {
  let webrtc: WebrtcStreaming;
  let clock: FakeTimers.InstalledClock;
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
          setupGetUserMedia({ audio: true, video: true })
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
          setupMockMediaDevices([]);
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
  describe("mediaDevicesAutoSwitch", () => {
    let mockWhipClient: MockedWhipClient;
    let firstTimeTracks: MockedMediaStreamTrack[];
    let endedTrack: MockedMediaStreamTrack;
    let autoReplaceTracks: MockedMediaStreamTrack[];
    let autoAudioTrack: MockedMediaStreamTrack;
    let onPlug: MockedFunction<(data: MediaDevicePlugInfo) => void>;
    let onUnplug: MockedFunction<(data: MediaDeviceUnplugInfo) => void>;
    afterEach(() => {
      clock.uninstall();
    });
    beforeEach(() => {
      clock = FakeTimers.install();
    });
    describe("basically", () => {
      beforeEach(async () => {
        webrtc = new WebrtcStreaming("http://localhost:8080/whip/s1", {
          mediaDevicesAutoSwitch: true,
        });
        setupMockMediaDevices([{
          kind: "audioinput",
          deviceId: "mic1",
          label: "Built-in microphone (default)",
          groupId: "",
          toJSON() {
            return {};
          },
        }, {
          kind: "audioinput",
          deviceId: "mic2",
          label: "AirPods Pro",
          groupId: "",
          toJSON() {
            return {};
          },
        }, {
          kind: "videoinput",
          deviceId: "camera1",
          label: "FaceTime HD Camera (Built-in)",
          groupId: "",
          toJSON() {
            return {};
          },
        }]);
        // for the first time permissions request and video resolutions probing
        setupDefaultGetUserMedia({ audio: true, video: true });

        setupGetUserMedia({ audio: true, video: true }); // MediaDevices.updateDevices
        await webrtc.mediaDevices.getCameras(); // to properly arrange calls to getUserMedia

        firstTimeTracks = setupGetUserMedia({ audio: true, video: true });
        endedTrack = firstTimeTracks.find((t) => t.kind === "audio") as any;
        endedTrack.getSettings.mockReturnValue({
          deviceId: "mic2",
        });

        autoReplaceTracks = setupGetUserMedia({ audio: true, video: true });
        autoAudioTrack = autoReplaceTracks.find((t) => t.kind === "audio") as any;
        autoAudioTrack.getSettings.mockReturnValue({
          deviceId: "mic1",
        });

        mockWhipClient = createMockWhipClient();
        // @ts-ignore
        WhipClient.mockReturnValueOnce(mockWhipClient);
        onPlug = vi.fn();
        onUnplug = vi.fn();
        webrtc.on(WebrtcStreamingEvents.MediaDeviceSwitch, onPlug);
        webrtc.on(WebrtcStreamingEvents.MediaDeviceSwitchOff, onUnplug);

        await webrtc.openSourceStream({
          audio: "mic2",
          video: "camera1",
        });
        await clock.tickAsync(0);
        await webrtc.run();
        await clock.tickAsync(0);
        // @ts-ignore
        window.navigator.mediaDevices.getUserMedia.mockClear();
        endedTrack.triggerEvent("ended");
        await clock.tickAsync(0);
      });
      // TODO break into smaller tests with fewer assertions
      it("should reconnect the default device", async () => {
        expect(window.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
          audio: true,
          video: expect.objectContaining({
            deviceId: {
              exact: "camera1",
            },
          }),
        });
        expect(mockWhipClient.removeTrack).toHaveBeenCalledTimes(2);
        expect(mockWhipClient.replaceTrack).toHaveBeenCalledTimes(2);
        autoReplaceTracks.forEach((t) => {
          const oldTrack = firstTimeTracks.find((ot) => ot.kind === t.kind);
          expect(mockWhipClient.removeTrack, `old ${t.kind} track should be removed`).toHaveBeenCalledWith(oldTrack);
          expect(mockWhipClient.replaceTrack, `new ${t.kind} track should be replaced`).toHaveBeenCalledWith(t);
        });
      });
      it("should emit notification", () => {
        expect(onPlug).toHaveBeenCalledWith({
          kind: "audio",
          device: expect.objectContaining({
            deviceId: "mic1",
            label: "Built-in microphone (default)",
            groupId: "",
          }),
          prev: expect.objectContaining({
            deviceId: "mic2",
            label: "AirPods Pro",
            groupId: "",
          }),
        })
      });
    });
    describe("errors", () => {
      describe.each([
        ["replaceTrack", (whipClient) => {
          whipClient.replaceTrack.mockRejectedValueOnce(new Error("Renegotiation needed"));
        }],
        ["getUserMedia", (_) => {
          // @ts-ignore
          window.navigator.mediaDevices.getUserMedia.mockReset().mockRejectedValueOnce(new Error("OverconstrainedError"));
        }]
      ])("%s", (_, setup) => {
        beforeEach(async () => {
          webrtc = new WebrtcStreaming("http://localhost:8080/whip/s1", {
            mediaDevicesAutoSwitch: true,
          });
          setupMockMediaDevices([{
            kind: "audioinput",
            deviceId: "mic1",
            label: "Built-in microphone (default)",
            groupId: "",
            toJSON() {
              return {};
            },
          }, {
            kind: "audioinput",
            deviceId: "mic2",
            label: "AirPods Pro",
            groupId: "",
            toJSON() {
              return {};
            },
          }, {
            kind: "videoinput",
            deviceId: "camera1",
            label: "FaceTime HD Camera (Built-in)",
            groupId: "",
            toJSON() {
              return {};
            },
          }]);
          // for the first time permissions request and video resolutions probing
          setupDefaultGetUserMedia({ audio: true, video: true });

          setupGetUserMedia({ audio: true, video: true }); // MediaDevices.updateDevices
          await webrtc.mediaDevices.getCameras(); // to properly arrange calls to getUserMedia

          firstTimeTracks = setupGetUserMedia({ audio: true, video: true });
          endedTrack = firstTimeTracks.find((t) => t.kind === "audio") as any;
          endedTrack.getSettings.mockReturnValue({
            deviceId: "mic2",
          });

          autoReplaceTracks = setupGetUserMedia({ audio: true, video: true });
          autoAudioTrack = autoReplaceTracks.find((t) => t.kind === "audio") as any;
          autoAudioTrack.getSettings.mockReturnValue({
            deviceId: "mic1",
          });

          mockWhipClient = createMockWhipClient();
          // @ts-ignore
          WhipClient.mockReturnValueOnce(mockWhipClient);
          onPlug = vi.fn();
          onUnplug = vi.fn();
          webrtc.on(WebrtcStreamingEvents.MediaDeviceSwitch, onPlug);
          webrtc.on(WebrtcStreamingEvents.MediaDeviceSwitchOff, onUnplug);

          await webrtc.openSourceStream({
            audio: "mic2",
            video: "camera1",
          });
          await clock.tickAsync(0);
          await webrtc.run();
          await clock.tickAsync(0);
          // @ts-ignore
          window.navigator.mediaDevices.getUserMedia.mockClear();
          setup(mockWhipClient);
          endedTrack.triggerEvent("ended");
          await clock.tickAsync(0);
        });
        it("should indicate error with sufficient details", () => {
          expect(onUnplug).toHaveBeenCalledWith({
            kind: "audio",
            device: expect.objectContaining({
              deviceId: "mic2",
              label: "AirPods Pro",
              groupId: "",
            }),
          });
        });
      })
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
