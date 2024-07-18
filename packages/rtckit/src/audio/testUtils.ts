import { Mock, vi } from "vitest";
import { type MockedMediaStream } from "../testUtils.js";

export function createMockAudioContext(): MockedAudioContext {
  return {
    state: "suspended",
    close: vi.fn(),
    createAnalyser: vi.fn(),
    createGain: vi.fn(),
    createMediaStreamDestination: vi.fn(),
    createMediaStreamSource: vi.fn(),
    onstatechange: null,
    resume: vi.fn(),
  };
}

export type AudioContextState = "suspended" | "interrupted" | "running" | "closed";

export type MockedAudioContext = {
  state: AudioContextState;
  onstatechange: (() => void) | null;
  close: Mock;
  createAnalyser: Mock;
  createGain: Mock;
  createMediaStreamDestination: Mock;
  createMediaStreamSource: Mock;
  resume: Mock;
};

export type MockedGainNode = {
  connect: Mock;
  disconnect: Mock;
  gain: {
    setValueAtTime: Mock;
    value: number;
  };
};

export type MockedMediaStreamAudioSourceNode = {
  mediaStream: MockedMediaStream;
  connect: Mock;
  disconnect: Mock;
};

export type MockedAudioDestinationNode = {
  stream: MockedMediaStream;
  disconnect: Mock;
};

export type MockedAnalyserNode = {
  connect: Mock;
  disconnect: Mock;
  frequencyBinCount: number;
  getByteFrequencyData: Mock;
};
