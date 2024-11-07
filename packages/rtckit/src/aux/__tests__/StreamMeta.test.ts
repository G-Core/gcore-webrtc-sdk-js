import { describe, expect, it, vi } from "vitest";

import { StreamMeta } from '../StreamMeta';

import { createMockMediaStreamTrack, MockRTCPeerConnection } from "../../testUtils";

describe("StreamMeta", () => {
  it("should append video resolution info to the URL", () => {
    const p = new StreamMeta();
    const pc = new MockRTCPeerConnection({});
    const videoTrack = createMockMediaStreamTrack("video");
    videoTrack.getSettings.mockReturnValue({ width: 1280, height: 720 });
    pc.getSenders.mockReturnValue([
      createMockRtpSender(videoTrack),
    ])

    p.init(pc);
    const url = new URL("http://example.com/whip");
    p.request(url, { method: "POST", headers: {}, body: "v=0\r\n" });

    expect(url.searchParams.get("width")).toBe("1280");
    expect(url.searchParams.get("height")).toBe("720");
  });
});

function createMockRtpSender(track: MediaStreamTrack) {
  return {
    track,
  };
}
