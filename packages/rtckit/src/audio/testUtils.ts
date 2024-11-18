import { Mock, vi } from "vitest";
import { type MockedMediaStream as MockMediaStream } from "../testUtils.js";

export function createMockAudioContext(): MockAudioContext {
  return {
    state: "suspended",
    close: vi.fn(),
    createAnalyser: vi.fn(),
    createConstantSource: vi.fn().mockImplementation(() => createMockConstantSourceNode()),
    createGain: vi.fn().mockImplementation(() => createMockGainNode()),
    createMediaStreamDestination: vi.fn(),
    createMediaStreamSource: vi.fn(),
    onstatechange: null,
    resume: vi.fn(),
  };
}

export function createMockConstantSourceNode() {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    offset: {
      setValueAtTime: vi.fn(),
      value: 0,
    },
  };
}

export function createMockGainNode() {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      value: 1,
    },
  };
}

export type AudioContextState = "suspended" | "interrupted" | "running" | "closed";

export type MockAudioContext = {
  state: AudioContextState;
  onstatechange: (() => void) | null;
  close: Mock;
  createAnalyser: Mock;
  createGain: Mock;
  createConstantSource: Mock;
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
