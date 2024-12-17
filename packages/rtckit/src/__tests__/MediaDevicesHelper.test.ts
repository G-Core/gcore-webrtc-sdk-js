import { beforeEach, describe, expect, it } from "vitest";

// import { Logger } from "../Logger.js";
import { LogTracer } from "../trace/LogTracer.js";
import { setTracer } from "../trace/index.js";
import { MediaDevicesHelper, MediaInputDeviceInfo } from "../MediaDevicesHelper.js";
import {
  createMockMediaStream,
  createMockMediaStreamTrack,
  MockedMediaStreamTrack,
  MockOverconstrainedError,
  setupDefaultGetUserMedia,
  setupGetUserMedia,
  setupMockMediaDevices,
} from "../testUtils";

// Logger.enable('*');
setTracer(new LogTracer("MediaDevicesHelper.test"));

describe("MediaDevices", () => {
  const devices: MediaDeviceInfo[] = [
    {
      deviceId: "mic01",
      kind: "audioinput",
      label: 'Built-in Microphone',
      groupId: "",
      toJSON() { return null },
    },
    {
      deviceId: "default",
      kind: "audioinput",
      label: 'AirPods',
      groupId: "",
      toJSON() { return null },
    },
    {
      deviceId: "camera01",
      kind: "videoinput",
      label: 'Built-in Camera',
      groupId: "",
      toJSON() { return null },
    }
  ]
  let mediaDevices: MediaDevicesHelper
  describe("getCameras", () => {
    beforeEach(() => {
      setupMockMediaDevices(devices)
      setupGetUserMedia({ video: true }) // this one for allowing to enumerate the devices
      for (const _ of new Array(5).fill(null)) {
        setupGetUserMedia({ video: true }) // for discovering the available video resolutions (1080 to 240)
      }
      mediaDevices = new MediaDevicesHelper()
    })
    describe("concurrent calls to devices list", () => {
      describe.each([
        [
          "video video",
        ],
        [
          "audio video"
        ],
        [
          "audio audio"
        ],
        [
          "video audio"
        ]
      ])("%s", (seq: string) => {
        beforeEach(async () => {
          const ps: Promise<MediaInputDeviceInfo[]>[] = []
          for (const s of seq.split(" ")) {
            const p = s == "audio" ? mediaDevices.getMicrophones() : mediaDevices.getCameras()
            ps.push(p)
          }
          await Promise.all(ps)
        })
        it("should only call the API once", async () => {
          expect(globalThis.navigator.mediaDevices.enumerateDevices).toHaveBeenCalledTimes(1)
        })
      })
    })
  })
  describe("getMicrophones", () => {
    describe("default device", () => {
      describe("basically", () => {
        beforeEach(() => {
          setupMockMediaDevices(devices)
          setupGetUserMedia({ audio: true })
          mediaDevices = new MediaDevicesHelper()
        })
        it("should not remove the default device from the list", async () => {
          const microphones = await mediaDevices.getMicrophones()
          expect(microphones).toHaveLength(2)
          expect(microphones).toEqual([{
            deviceId: "mic01",
            label: 'Built-in Microphone',
            groupId: "",
          },
          {
            deviceId: "default",
            label: 'AirPods',
            groupId: "",
          }])
        })
      })
      describe("when there is only one device", () => {
        beforeEach(() => {
          setupMockMediaDevices(devices.filter((d) => d.kind === "videoinput" || d.deviceId === "default"))
          setupGetUserMedia({ audio: true })
          mediaDevices = new MediaDevicesHelper()
        })
        it("should keep the only default item", async () => {
          const microphones = await mediaDevices.getMicrophones()
          expect(microphones).toHaveLength(1)
          expect(microphones).toEqual([{
            deviceId: "default",
            label: 'AirPods',
            groupId: "",
          }])
        })
      })
    })
  })
  describe("video resolutions", () => {
    beforeEach(() => {
      setupMockMediaDevices(devices) // the only camera is camera01
      window.navigator.mediaDevices.getUserMedia
        // @ts-ignore
        .mockResolvedValueOnce(createMockMediaStream([createVideoTrack(640, 360, "default")])) // permissions request
        .mockRejectedValueOnce(new MockOverconstrainedError("height"))
        .mockRejectedValueOnce(new MockOverconstrainedError("width"))
        .mockResolvedValueOnce(createMockMediaStream([createVideoTrack(640, 360, "camera01")])) // 360
        .mockResolvedValueOnce(createMockMediaStream([createVideoTrack(854, 480, "camera01")])) // 480
        .mockResolvedValueOnce(createMockMediaStream([createVideoTrack(1280, 720, "camera01")])) // 720
        .mockRejectedValueOnce(new MockOverconstrainedError("height"))
        .mockRejectedValueOnce(new MockOverconstrainedError("width"));
      mediaDevices = new MediaDevicesHelper()
    })
    it("should return only the available resolutions", async () => {
      await mediaDevices.getCameras()
      const resolutions = mediaDevices.getAvailableVideoResolutions("camera01")
      expect(resolutions).toEqual([
        {
          width: 1280,
          height: 720,
        },
        {
          width: 854,
          height: 480,
        },
        {
          width: 640,
          height: 360,
        }
      ])
    })
  })
  describe("permissions to enumerate the devices", () => {
    // TODO
    describe.each([
      [
        "video",
        [
          { kind: "audioinput" as MediaDeviceKind, deviceId: "mic1", groupId: "", label: "Built-in mic", toJSON: () => null }
        ],
      ],
      [
        "audio",
        [{ kind: "videoinput" as MediaDeviceKind, deviceId: "camera1", groupId: "", label: "Face Time camera", toJSON: () => null }],
      ],
    ])("%s", (constraint, devices) => {
      beforeEach(() => {
        mediaDevices = new MediaDevicesHelper()

        setupMockMediaDevices(devices);
        setupNoGetUserMedia(constraint);
        setupDefaultGetUserMedia({ audio: true, video: true });
      });
      it("should retry with looser contraints", async () => {
        if (constraint === "audio") {
          await mediaDevices.getCameras();
        } else {
          await mediaDevices.getMicrophones();
        }
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenNthCalledWith(1, {
          audio: true,
          video: true,
        });
        const looseConstraint = constraint === "audio" ? { video: true } : { audio: true };
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenNthCalledWith(2, looseConstraint);
      })
    })
  })
})

export function setupNoGetUserMedia(reason: string) {
  const err = new MockOverconstrainedError(reason);
  // @ts-ignore
  window.navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(err);
}

function createVideoTrack(width: number, height: number, deviceId: string, id?: string): MockedMediaStreamTrack {
  const track = createMockMediaStreamTrack("video", id);
  track.getSettings.mockReturnValue({
    width,
    height,
    deviceId,
  })
  return track;
}
