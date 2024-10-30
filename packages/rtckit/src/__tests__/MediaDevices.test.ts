import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaDevicesHelper } from "../MediaDevices";
import { createMockMediaStream, createMockMediaStreamTrack, setupMockUserMedia } from "../testUtils";

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
      setupMockUserMedia(devices)
      mediaDevices = new MediaDevicesHelper()
    })
    describe("concurrent calls to devices list", () => {
      // })
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
          const ps: Promise<MediaDeviceInfo[]>[] = []
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
  describe("video resolutions", () => {
    beforeEach(() => {
      setupMockUserMedia(devices)
      window.navigator.mediaDevices.getUserMedia
        .mockReset()
        .mockResolvedValueOnce(createMockMediaStream([createMockMediaStreamTrack("video")])) // before updateDevices
        .mockRejectedValueOnce(new Error("Overconstrained")) // 1080
        .mockResolvedValueOnce(createMockMediaStream([createMockMediaStreamTrack("video")])) // 720
        .mockResolvedValueOnce(createMockMediaStream([createMockMediaStreamTrack("video")])) // 480
        .mockResolvedValueOnce(createMockMediaStream([createMockMediaStreamTrack("video")])) // 360
        .mockRejectedValueOnce(new Error("Overconstrained")) // 240
      mediaDevices = new MediaDevicesHelper()
    })
    it("should return only the resolutions available", async () => {
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
})
