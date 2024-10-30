import { beforeEach, describe, expect, it, MockedFunction, vi } from "vitest";
import { WhipClient, WhipClientEvents } from "../WhipClient.js";
import { createMockMediaStream, createMockMediaStreamTrack, MockedMediaStreamTrack } from "../../testUtils.js";

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
  });
  // TODO unskip
  describe("start", () => {
    let audioTrack: MockedMediaStreamTrack;
    let videoTrack: MockedMediaStreamTrack;
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
        await client.start(stream as MediaStream);
      });
      it.skip("should run preflight request", () => { // because ICE servers are not specified
        expect(globalThis.fetch).toHaveBeenCalledWith("https://example.com/whip", expect.objectContaining({
          method: "OPTIONS",
        }));
      });
      it("should set content hint for the video track accordingly", () => {
        expect(videoTrack.contentHint).toBe(contentHint);
      })
    })
  });
});

class MockRTCPeerConnection {
  configuration = null
  localDescription = null
  
  remoteDescription = null

  constructor(config) {
    this.configuration = config;
  }

  addTrack(track, ...streams) {}

  addTransceiver(trackOrKind, init) {}

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