import { beforeEach, describe, expect, it, MockedFunction, vi } from "vitest";
import { WhipClient, WhipClientEvents } from "../WhipClient.js";
import { createMockMediaStream } from "../../testUtils.js";

describe("WhipClient", () => {
  let client: WhipClient;
  // let spyFetch: MockedFunction<typeof fetch>;
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
    // @ts-ignore
    globalThis.RTCPeerConnection = MockRTCPeerConnection;
    client = new WhipClient("https://example.com/whip", {
      canTrickleIce: true,
    });
  });
  describe("start", () => {
    beforeEach(async () => {
      const stream = createMockMediaStream();
      await client.start(stream as MediaStream);
    });
    it("should run preflight request", () => {
      expect(globalThis.fetch).toHaveBeenCalledWith("https://example.com/whip", expect.objectContaining({
        method: "OPTIONS",
      }));
    });
  });
});

class MockRTCPeerConnection {
  configuration = null
  localDescription = null
  
  remoteDescription = null

  constructor(config) {
    this.configuration = config;
  }

  createAnswer() {
    return {
      sdp: "v=0\r\n",
      type: "answer",
    }
  }

  close() {}

  createOffer() {
    return {
      sdp: "v=0\r\n",
      type: "offer",
    }
  }

  generateCertificate() {
    return Promise.reject(new Error("Not implemented"));
  }

  getConfiguration() {
    return this.configuration;
  }

  setLocalDescription(ld) {
    this.localDescription = ld
  }

  setRemoteDescription(rd) {
    this.remoteDescription = rd;
  }
}