import { MockedFunction, MockedObject, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as FakeTimers from "@sinonjs/fake-timers";

import { MediaDeviceSwitchInfo, MediaDeviceSwitchOffInfo, WebrtcStreaming, WebrtcStreamingEvents } from "../WebrtcStreaming.js";

import { WhipClient } from "../whip/WhipClient.js";

import { Logger } from "../Logger.js";
import { LogTracer } from "../trace/LogTracer.js";
import { setTracer } from "../trace/index.js";
import {
  MockedMediaStream,
  MockedMediaStreamTrack,
  MockOverconstrainedError,
  setupGetUserMedia,
  setupMockMediaDevices,
  setupVideoResolutionProbes,
} from "../testUtils.js";

Logger.enable("*");
setTracer(new LogTracer());

vi.mock("../whip/WhipClient.js", () => ({
  WhipClient: vi.fn(),
}));

const MOCK_MEDIA_DEVICES = [{
  kind: "audioinput" as MediaDeviceKind,
  deviceId: "mic1",
  label: "Built-in microphone (default)",
  groupId: "",
  toJSON() {
    return {};
  },
}, {
  kind: "audioinput" as MediaDeviceKind,
  deviceId: "mic2",
  label: "AirPods Pro",
  groupId: "",
  toJSON() {
    return {};
  },
}, {
  kind: "videoinput" as MediaDeviceKind,
  deviceId: "camera1",
  label: "FaceTime HD Camera (Built-in)",
  groupId: "",
  toJSON() {
    return {};
  },
}];

describe("WebrtcStreaming", () => {
  let webrtc: WebrtcStreaming;
  let mockWhipClient: MockedWhipClient;
  let clock: FakeTimers.InstalledClock;
  describe("preview", () => {
    let video: HTMLVideoElement;
    beforeEach(async () => {
      webrtc = new WebrtcStreaming("http://localhost:8080/whip/s1", {
        debug: true,
      });
      setupMockMediaDevices(MOCK_MEDIA_DEVICES);
      setupGetUserMedia({ audio: true, video: true });
      setupGetUserMedia({ audio: true, video: true });
      setupVideoResolutionProbes();
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
          webrtc = new WebrtcStreaming("http://localhost:8080/whip/s1", {
            debug: true,
          });
          setupMockMediaDevices(MOCK_MEDIA_DEVICES);
          setupGetUserMedia({ audio: true, video: true }); // initial permissions request
          setupVideoResolutionProbes();
          setupGetUserMedia({ audio: !!firstParams.audio, video: firstParams.video });
          await webrtc.openSourceStream(firstParams);
          setupGetUserMedia({
            audio: !!(secondParams ?? firstParams.audio),
            video: !!(secondParams.video ?? firstParams.video)
          });
          await webrtc.openSourceStream(secondParams);
        });
        if (expectedConstraints) {
          it("should call getUserMedia second time with the new constraints", () => {
            // permissions request + 5 video resolutions + 2 distinct openSourceStream calls
            expect(window.navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(8);
            expect(window.navigator.mediaDevices.getUserMedia).toHaveBeenNthCalledWith(8, expectedConstraints);
          });
        } else {
          it("should not call getUserMedia second time", () => {
            expect(window.navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(7);
          });
        }
      });
    });
    // TODO test that device probes are always done at first openSourceStream call
    describe("hot track replacement", () => {
      describe("when the audio track is turned off", () => {
        let firstTimeTracks: MediaStreamTrack[];
        beforeEach(() => {
          webrtc = new WebrtcStreaming("http://localhost:8080/whip/s1", {
            debug: true,
          });
          setupMockMediaDevices(MOCK_MEDIA_DEVICES);
          setupGetUserMedia({ audio: true, video: true }); // initial permissions request
          setupVideoResolutionProbes();
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
    let firstTimeTracks: MockedMediaStreamTrack[];
    let endedTrack: MockedMediaStreamTrack;
    let autoReplaceTracks: MockedMediaStreamTrack[];
    let autoAudioTrack: MockedMediaStreamTrack;
    let onPlug: MockedFunction<(data: MediaDeviceSwitchInfo) => void>;
    let onUnplug: MockedFunction<(data: MediaDeviceSwitchOffInfo) => void>;
    afterEach(() => {
      clock.uninstall();
    });
    beforeEach(() => {
      clock = FakeTimers.install();
    });
    describe("basically", () => {
      beforeEach(async () => {
        webrtc = new WebrtcStreaming("http://localhost:8080/whip/s1", {
          debug: true,
          mediaDevicesAutoSwitch: true,
        });
        setupMockMediaDevices(MOCK_MEDIA_DEVICES);
        // for the first time permissions request and video resolutions probing

        setupGetUserMedia({ audio: true, video: true }); // MediaDevices.updateDevices initial permission
        setupVideoResolutionProbes();
        await webrtc.mediaDevices.getCameras(); // to properly arrange calls to getUserMedia

        firstTimeTracks = setupGetUserMedia({ audio: true, video: true });
        endedTrack = firstTimeTracks[0]
        endedTrack.getSettings.mockReturnValue({
          deviceId: "mic2",
        });
        const liveTrack = firstTimeTracks[1];
        liveTrack.getSettings.mockReturnValue({
          deviceId: "camera1",
        });
        autoReplaceTracks = setupGetUserMedia({ audio: true, video: true });
        autoAudioTrack = autoReplaceTracks[0];
        autoAudioTrack.getSettings.mockReturnValue({
          deviceId: "mic1",
        });
        autoReplaceTracks[1].getSettings.mockReturnValue({
          deviceId: "camera1",
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

        endedTrack.dispatchEvent("ended");
        await clock.tickAsync(1002); // refreshMediaDevices + some time for the callbacks
      });
      // TODO break into smaller tests with fewer assertions
      it("should reconnect the default device", () => {
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
          window.navigator.mediaDevices.getUserMedia.mockReset().mockRejectedValueOnce(new MockOverconstrainedError("deviceId"));
          setupVideoResolutionProbes(); // after the OverconstrainedError
        }]
      ])("%s", (_, setup) => {
        beforeEach(async () => {
          webrtc = new WebrtcStreaming("http://localhost:8080/whip/s1", {
            debug: true,
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

          setupGetUserMedia({ audio: true, video: true }); // MediaDevices.updateDevices initial permissions request
          setupVideoResolutionProbes();

          await webrtc.mediaDevices.getCameras(); // to properly arrange calls to getUserMedia

          firstTimeTracks = setupGetUserMedia({ audio: true, video: true });
          endedTrack = firstTimeTracks.find((t) => t.kind === "audio") as any;
          endedTrack.getSettings.mockReturnValue({
            deviceId: "mic2",
          });
          firstTimeTracks[1].getSettings.mockReturnValue({
            deviceId: "camera1",
          });
          setupVideoResolutionProbes(); // after first trackended event and consequent devices list refresh

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

          endedTrack.dispatchEvent("ended");
          await clock.tickAsync(1000); // refresh devices list delay 1st (after trackended)
          await clock.tickAsync(1000); // refresh devices list delay 2nd (after OverconstraintError)
          await clock.tickAsync(2);
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
    describe("when a streaming device disconnects", () => {
      let initialTracks: MockedMediaStreamTrack[];
      let stream: MockedMediaStream;
      const devices = [
        {
          kind: "audioinput" as MediaDeviceKind,
          deviceId: "default",
          label: "Default microphone (0aeb)",
          groupId: "",
          toJSON: () => null,
        },
        {
          kind: "audioinput" as MediaDeviceKind,
          deviceId: "mic1",
          label: "Built-in microphone (0aeb)",
          groupId: "",
          toJSON: () => null,
        }, {
          kind: "audioinput" as MediaDeviceKind,
          deviceId: "mic2",
          label: "USB camera mic (4040)",
          groupId: "0aec",
          toJSON: () => null,
        }, {
          kind: "videoinput" as MediaDeviceKind,
          deviceId: "default (0aeb)",
          label: "Default camera (0aeb)",
          groupId: "",
          toJSON: () => null,
        }, {
          kind: "videoinput" as MediaDeviceKind,
          deviceId: "camera1",
          label: "Built-in camera (0aeb)",
          groupId: "",
          toJSON: () => null,
        }, {
          kind: "videoinput" as MediaDeviceKind,
          deviceId: "camera2",
          label: "USB camera (4040)",
          groupId: "0aec",
          toJSON: () => null,
        }
      ];
      describe("basically", () => {
        beforeEach(async () => {
          const md = setupMockMediaDevices([]);
          md.enumerateDevices.mockResolvedValueOnce(devices);
          const nextDevices = devices.slice();
          md.enumerateDevices.mockResolvedValueOnce(nextDevices);
          setupGetUserMedia({ audio: true, video: true }); // initial permissions request
          devices.forEach((d: MediaDeviceInfo) => {
            if (d.kind === "videoinput") {
              setupVideoResolutionProbes();
            }
          });
          initialTracks = setupGetUserMedia({ audio: true, video: true }); // first stream request
          initialTracks[0].getSettings.mockReturnValue({
            deviceId: "mic1",
          });
          initialTracks[1].getSettings.mockReturnValue({
            deviceId: "camera1",
          });
          const newTracks = setupGetUserMedia({ audio: true, video: true }); // second request
          newTracks[0].getSettings.mockReturnValue({
            deviceId: "mic2",
          });
          newTracks[1].getSettings.mockReturnValue({
            deviceId: "camera2",
          });

          mockWhipClient = createMockWhipClient();
          // @ts-ignore
          WhipClient.mockReturnValueOnce(mockWhipClient);

          webrtc = new WebrtcStreaming("http://localhost:8080/whip/s1", {
            debug: true,
            mediaDevicesAutoSwitch: true,
          });
          // @ts-ignore
          stream = await webrtc.openSourceStream({
            audio: true,
            video: true,
          })
          await webrtc.run(); // will use the stream
          (globalThis.navigator.mediaDevices.enumerateDevices as MockedFunction<() => Promise<InputDeviceInfo[]>>).mockClear();
          initialTracks[0].dispatchEvent("ended");
          await clock.tickAsync(0);
        });
        it("should close the current source stream", () => {
          initialTracks.forEach((t) => {
            expect(t.stop).toHaveBeenCalled();
          });
        });
        it.skip("should request a new stream", () => {
          // TODO
        });
      });
      describe("mediaDevicesAutoSwitchRefresh", () => {
        beforeEach(async () => {
          const md = setupMockMediaDevices([]);
          const nextDevices = devices.filter((d) => d.deviceId !== "mic2" && d.deviceId !== "camera2");
          md.enumerateDevices.mockResolvedValueOnce(devices);
          md.enumerateDevices.mockResolvedValueOnce(devices);
          setupGetUserMedia({ audio: true, video: true }); // initial permissions request
          devices.forEach((d: MediaDeviceInfo) => {
            if (d.kind === "videoinput") {
              setupVideoResolutionProbes();
            }
          });
          initialTracks = setupGetUserMedia({ audio: true, video: true }); // first stream request
          initialTracks[0].getSettings.mockReturnValue({
            deviceId: "mic2",
          });
          initialTracks[1].getSettings.mockReturnValue({
            deviceId: "camera2",
          });
          nextDevices.forEach((d: MediaDeviceInfo) => {
            if (d.kind === "videoinput") {
              setupVideoResolutionProbes();
            }
          });
          const newTracks = setupGetUserMedia({ audio: true, video: true }); // second request
          newTracks[0].getSettings.mockReturnValue({
            deviceId: "default",
          });
          newTracks[1].getSettings.mockReturnValue({
            deviceId: "default",
          });

          mockWhipClient = createMockWhipClient();
          // @ts-ignore
          WhipClient.mockReturnValueOnce(mockWhipClient);

          webrtc = new WebrtcStreaming("http://localhost:8080/whip/s1", {
            debug: true,
            mediaDevicesAutoSwitch: true,
          });
          // @ts-ignore
          stream = await webrtc.openSourceStream({
            audio: true,
            video: true,
          })
          await webrtc.run(); // will use the stream
          initialTracks[0].dispatchEvent("ended");
        });
        it("should not refresh the list of available devices instantly", () => {
          expect(globalThis.navigator.mediaDevices.enumerateDevices).toHaveBeenCalledTimes(1);
        });
        it("should refresh the list of available devices after a delay", async () => {
          await clock.tickAsync(1000);
          expect(globalThis.navigator.mediaDevices.enumerateDevices).toHaveBeenCalledTimes(2);
        });
      });
    });
    describe.skip("when both audio and video devices disconnect", () => {
      // TODO
      // e.g., video track is stopped and audio track but both devices disappear so the next getUserMedia call
      // throws an OverconstrainedError
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

