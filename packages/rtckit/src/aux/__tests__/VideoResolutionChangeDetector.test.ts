import { afterEach, beforeEach, describe, expect, it, MockedObject, MockedFunction, vi } from "vitest";

import FakeTimers from "@sinonjs/fake-timers";

import { VideoResolutionChangeDetector, VideoResolutionChangeEventData } from '../VideoResolutionChangeDetector';

import { createMockMediaStreamTrack, MockRTCPeerConnection } from "../../testUtils";

describe("VideoResolutionChangeDetector", () => {
  let clock: FakeTimers.InstalledClock;
  let vrcd: VideoResolutionChangeDetector;
  let pc: MockedObject<RTCPeerConnection>;
  let mockVideoSender;
  let onchange: MockedFunction<(data: VideoResolutionChangeEventData) => void>;
  beforeEach(() => {
    pc = new MockRTCPeerConnection();
    const videoTrack = createMockMediaStreamTrack("video");
    videoTrack.getSettings.mockReturnValue({
      width: 1920,
      height: 1080,
    });
    mockVideoSender = createMockRtpSender(videoTrack);
    pc.getSenders.mockReturnValue([mockVideoSender]);
    onchange = vi.fn();
    vrcd = new VideoResolutionChangeDetector(onchange);
    clock = FakeTimers.install();
    vrcd.init(pc);
  });
  afterEach(() => {
    clock.uninstall();
  });
  it("should report the resolution degradation", async () => {
    mockVideoSender.getStats.mockResolvedValue(new Map(
      [
        [
          "1", {
          type: "outbound-rtp",
          ssrc: 123,
          frameWidth: 1280,
          frameHeight: 720
        }]
      ]
    ));
    await clock.tickAsync(1000);
    expect(onchange).toHaveBeenCalledWith({
      ssrc: 123,
      degraded: true,
      width: 1280,
      height: 720,
      srcWidth: 1920,
      srcHeight: 1080
    });
  });
  it("should report the resolution degradation every time it changes", async () => {
    mockVideoSender.getStats.mockResolvedValueOnce(new Map(
      [
        [
          "2", {
          type: "outbound-rtp",
          ssrc: 123,
          frameWidth: 640,
          frameHeight: 360
        }]
      ]
    )).mockResolvedValueOnce(new Map(
      [
        [
          "3", {
          type: "outbound-rtp",
          ssrc: 123,
          frameWidth: 854,
          frameHeight: 480
        }
        ]
      ]
    ));
    await clock.tickAsync(1000);
    expect(onchange).toHaveBeenCalledWith({
      ssrc: 123,
      degraded: true,
      width: 640,
      height: 360,
      srcWidth: 1920,
      srcHeight: 1080
    });
    await clock.tickAsync(1000);
    expect(onchange).toHaveBeenCalledWith({
      ssrc: 123,
      degraded: true,
      width: 854,
      height: 480,
      srcWidth: 1920,
      srcHeight: 1080
    });
  });
  it("should report the resolution recovery", async () => {
    mockVideoSender.getStats.mockResolvedValueOnce(new Map(
      [
        [
          "2", {
          type: "outbound-rtp",
          ssrc: 123,
          frameWidth: 1280,
          frameHeight: 720
        }]
      ]
    )).mockResolvedValueOnce(new Map(
      [
        [
          "3", {
          type: "outbound-rtp",
          ssrc: 123,
          frameWidth: 1920,
          frameHeight: 1080
        }
        ]
      ]
    ));
    await clock.tickAsync(1000);
    await clock.tickAsync(1000);
    expect(onchange).toHaveBeenCalledWith(expect.objectContaining({
      ssrc: 123,
      degraded: false,
    }));
  })
});

function createMockRtpSender(track) {
  return {
    dtmf: null,
    track,
    transform: null,
    transport: null,
    getStats: vi.fn(),
    getCapabilities: vi.fn(),
    getParameters: vi.fn(),
    setParameters: vi.fn(),
    replaceTrack: vi.fn(),
  }
}
