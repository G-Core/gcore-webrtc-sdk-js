import { beforeEach, describe, expect, it, MockedFunction, MockedObject, vi } from "vitest";
import { WhipClient } from "../WhipClient.js";
import { createMockMediaStream, createMockMediaStreamTrack, MockedMediaStreamTrack, MockRTCPeerConnection } from "../../testUtils.js";
import { createMockAudioContext, MockAudioContext } from "../../audio/testUtils.js";
import { WhipClientPlugin } from "../types.js";

describe("WhipClient", () => {
  let audioTrack: MockedMediaStreamTrack;
  let videoTrack: MockedMediaStreamTrack;
  let client: WhipClient;
  beforeEach(() => {
    setupWhipWithoutPreflight();
  });
  describe("contentHint", () => {
    describe.each([
      ["explicitly on", { videoPreserveInitialResolution: true }, "detail"],
      ["explicitly off", { videoPreserveInitialResolution: false }, ""],
      ["implicitly off", {}, ""],
    ])("%s", (_, opts, contentHint) => {
      beforeEach(async () => {
        audioTrack = createMockMediaStreamTrack("audio");
        videoTrack = createMockMediaStreamTrack("video");

        const stream = createMockMediaStream([audioTrack, videoTrack]);
        client = new WhipClient("https://example.com/whip", {
          canTrickleIce: true,
          ...opts
        });
        // @ts-ignore
        globalThis.RTCPeerConnection = MockRTCPeerConnection;
        await client.start(stream as MediaStream);
      });
      it("should set content hint for the video track accordingly", () => {
        expect(videoTrack.contentHint).toBe(contentHint);
      });
    });
  });
  describe("insertSilentAudio", () => {
    let mockConn: any;
    let audioContext: MockAudioContext;
    beforeEach(async () => {
      audioContext = createMockAudioContext();
      audioTrack = createMockMediaStreamTrack("audio");
      let audioStream = createMockMediaStream([audioTrack]);
      let mockDestNode = createMockMediaStreamDestinationNode(audioStream);
      audioContext.createMediaStreamDestination.mockReturnValue(mockDestNode);
      window.AudioContext = vi.fn().mockImplementation(() => audioContext);
      videoTrack = createMockMediaStreamTrack("video");

      const stream = createMockMediaStream([videoTrack]);
      client = new WhipClient("https://example.com/whip", {
        canTrickleIce: true,
      });
      mockConn = new MockRTCPeerConnection({});
      // @ts-ignore
      globalThis.RTCPeerConnection = vi.fn().mockReturnValue(mockConn);
      await client.start(stream as MediaStream);
    });
    it("should create and send a silent audio track", () => {
      expect(window.AudioContext).toHaveBeenCalled();
      expect(audioContext.createMediaStreamDestination).toHaveBeenCalled();
      expect(mockConn.addTrack).toHaveBeenCalledWith(audioTrack)
    });
  });
  describe("pluigins", () => {
    let plugin: WhipClientPlugin;
    let pc: MockedObject<RTCPeerConnection>;
    beforeEach( () => {
      plugin = {
        close: vi.fn(),
        init: vi.fn(),
      };
      pc = new MockRTCPeerConnection();
      // @ts-ignore
      globalThis.RTCPeerConnection = vi.fn().mockReturnValue(pc);
      client = new WhipClient("https://example.com/whip", {
        canTrickleIce: true, // don't wait for ICE candidates before starting
        plugins: [plugin],
      });
    })
    it("should initialize plugins when a peer connection is created", async () => {
      audioTrack = createMockMediaStreamTrack("audio");
      videoTrack = createMockMediaStreamTrack("video");
      const stream = createMockMediaStream([audioTrack, videoTrack]);

      await client.start(stream);
      expect(plugin.init).toHaveBeenCalledWith(pc);
    });
    it("should close plugins when the client is closed", async () => {
      await client.close();
      expect(plugin.close).toHaveBeenCalled();
    });
  })
  describe("query params", () => {
    it("should append query params to the session initiation request", async () => {
      audioTrack = createMockMediaStreamTrack("audio");
      videoTrack = createMockMediaStreamTrack("video");
      const stream = createMockMediaStream([audioTrack, videoTrack]);
      client = new WhipClient("https://example.com/whip", {
        canTrickleIce: true,
        whipQueryParams: {
          "key": "value",
        }
      });
      // @ts-ignore
      globalThis.RTCPeerConnection = MockRTCPeerConnection;

      await client.start(stream as MediaStream);

      expect(globalThis.fetch).toHaveBeenCalledWith("https://example.com/whip?key=value", expect.any(Object));
    });
  })
});

function createMockMediaStreamDestinationNode(stream) {
  return {
    get stream() {
      return stream;
    }
  }
}

function setupWhipWithoutPreflight() {
  // Session initiation request only
  vi.spyOn(globalThis, "fetch").mockReset().mockResolvedValueOnce({
    ok: true,
    headers: new Headers({
      location: "https://m01.video.com/s/123",
    }),
    status: 200,
    text: () => Promise.resolve("v=0\r\n"),
  } as any);
}
