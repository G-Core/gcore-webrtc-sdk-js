import { MockedFunction, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FakeTimers from "@sinonjs/fake-timers";

import {
  createMockAudioContext,
  type MockedAnalyserNode,
  type MockedAudioContext,
  type MockedMediaStreamAudioSourceNode,
} from "../testUtils.js";
import {
    type MockedMediaStream,
  type MockedMediaStreamTrack,
  createMockMediaStream,
  createMockMediaStreamTrack,
} from "../../testUtils.js";

import { VolumeMeter } from "../VolumeMeter.js";

describe("VolumeMeter", () => {
  let volumeMeter: VolumeMeter;
  let sourceNode: MockedMediaStreamAudioSourceNode;
  let analyserNode: MockedAnalyserNode;
  let audioContext: MockedAudioContext;
  let mediaStream: MockedMediaStream;
  let mediaTrack: MockedMediaStreamTrack;
  let mediaTrackClone: MockedMediaStreamTrack;
  let clock: FakeTimers.InstalledClock;

  beforeEach(() => {
    audioContext = createMockAudioContext();
    mediaStream = createMockMediaStream();
    sourceNode = {
      mediaStream,
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    analyserNode = {
      frequencyBinCount: 128,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getByteFrequencyData: vi.fn(),
    };
    audioContext.createAnalyser.mockReturnValue(analyserNode);
    audioContext.createMediaStreamSource.mockReturnValue(sourceNode);
    mediaTrack = createMockMediaStreamTrack("audio", "track01");
    mediaTrack.enabled = false;
    mediaTrackClone = createMockMediaStreamTrack("audio", "track02");
    mediaTrack.clone.mockReturnValue(mediaTrackClone);
    global.MediaStream = vi.fn().mockReturnValue(mediaStream);
    volumeMeter = new VolumeMeter(
      () => Promise.resolve(audioContext as unknown as AudioContext),
      mediaTrack as unknown as MediaStreamTrack
    );
    clock = FakeTimers.install();
  });
  afterEach(() => {
    clock.uninstall();
  });
  describe("initialize", () => {
    it("should clone media track and enable it", () => {
      expect(mediaTrack.clone).toHaveBeenCalled();
      expect(mediaTrackClone.enabled).toBe(true);
    });
  });
  describe("close", () => {
    beforeEach(async () => {
      sourceNode.mediaStream = mediaStream;
      mediaStream.getTracks.mockReturnValue([mediaTrackClone]);
      volumeMeter.start(vi.fn());
      await clock.tickAsync(0);
      volumeMeter.close();
    });
    it("should disconnect nodes", () => {
      expect(sourceNode.disconnect).toHaveBeenCalled();
    });
    it("should close media stream", () => {
      expect(mediaTrackClone.stop).toHaveBeenCalled();
      expect(mediaTrack.stop).not.toHaveBeenCalled();
    });
  });
  describe("start", () => {
    let cb: MockedFunction<(volume: number) => void>;
    beforeEach(() => {
      cb = vi.fn();
      analyserNode.frequencyBinCount = 32;
      analyserNode.getByteFrequencyData.mockImplementation((buffer) => {
        buffer.fill(127);
      });
      volumeMeter.start(cb);
    });
    it("should create media source node", () => {
      expect(MediaStream).toHaveBeenCalledWith(
        expect.arrayContaining([mediaTrackClone])
      );
      expect(audioContext.createMediaStreamSource).toHaveBeenCalledWith(
        mediaStream
      );
    });
    it("should create analyser node", () => {
      expect(audioContext.createAnalyser).toHaveBeenCalled();
    });
    it("should connect source node to analyser", () => {
      expect(sourceNode.connect).toHaveBeenCalledWith(analyserNode);
    });
    it("should begin polling frequency data", () => {
      clock.tick(100);
      expect(cb).toHaveBeenCalledWith(127 / 255);
    });
  });
});
