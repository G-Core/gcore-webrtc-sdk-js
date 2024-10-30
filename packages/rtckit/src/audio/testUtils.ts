import { Mock, vi } from "vitest";
import { type MockedMediaStream as MockMediaStream } from "../testUtils.js";

export function createMockAudioContext(): MockAudioContext {
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

export type MockAudioContext = {
  state: AudioContextState;
  onstatechange: (() => void) | null;
  close: Mock;
  createAnalyser: Mock;
  createGain: Mock;
  createMediaStreamDestination: Mock;
  createMediaStreamSource: Mock;
  resume: Mock;
};

export type MockGainNode = {
  connect: Mock;
  disconnect: Mock;
  gain: {
    setValueAtTime: Mock;
    value: number;
  };
};

export type MockMediaStreamAudioSourceNode = {
  mediaStream: MockMediaStream;
  connect: Mock;
  disconnect: Mock;
};

export type MockAudioDestinationNode = {
  stream: MockMediaStream;
  disconnect: Mock;
};

export type MockAnalyserNode = {
  connect: Mock;
  disconnect: Mock;
  frequencyBinCount: number;
  getByteFrequencyData: Mock;
};
