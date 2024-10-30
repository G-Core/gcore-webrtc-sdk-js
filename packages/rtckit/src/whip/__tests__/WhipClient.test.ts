import { beforeEach, describe, expect, it, MockedFunction, vi } from "vitest";
import { WhipClient } from "../WhipClient.js";
import { createMockMediaStream, createMockMediaStreamTrack, MockedMediaStreamTrack } from "../../testUtils.js";
import { createMockAudioContext, MockAudioContext } from "../../audio/testUtils.js";

describe("WhipClient", () => {
  let audioTrack: MockedMediaStreamTrack;
  let videoTrack: MockedMediaStreamTrack;
  let client: WhipClient;
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      status: 200,
    } as any).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        location: "https://m01.video.com/s/123",
      }),
      status: 200,
      text: () => Promise.resolve("v=0\r\n"),
    } as any);
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
      it.skip("should run preflight request", () => { // because ICE servers are not specified
        expect(globalThis.fetch).toHaveBeenCalledWith("https://example.com/whip", expect.objectContaining({
          method: "OPTIONS",
        }));
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
      // TODO mock audio context
      await client.start(stream as MediaStream);
    });
    it("should create and send a silent audio track", () => {
      expect(window.AudioContext).toHaveBeenCalled();
      expect(audioContext.createMediaStreamDestination).toHaveBeenCalled();
      expect(mockConn.addTrack).toHaveBeenCalledWith(audioTrack)
    });
  });
});

function MockRTCPeerConnection(configuration: any = null) {
  const retval = {
    configuration,
    localDescription: null,
    remoteDescription: null,
  
    addTrack: vi.fn(),
    addTransceiver: vi.fn(),
    createAnswer: vi.fn().mockReturnValue({
      sdp: "v=0\r\n",
      type: "answer",
    }),
    close: vi.fn(),
  
    createOffer: vi.fn().mockReturnValue({
      sdp: "v=0\r\n",
      type: "offer",
    }),
  
    generateCertificate: vi.fn().mockImplementation(() => {
      return Promise.reject(new Error("Not implemented"));
    }),
  
    getConfiguration() {
      return this.configuration;
    },
  
    setLocalDescription(ld) {
      this.localDescription = ld
    },
  
    setRemoteDescription(rd) {
      this.remoteDescription = rd;
    }
  };
  Object.assign(this, retval);
  // return this;
}

function createMockMediaStreamDestinationNode(stream) {
  return {
    get stream() {
      return stream;
    }
  }
}
