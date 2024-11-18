import { afterEach, beforeEach, describe, expect, it, MockedFunction, MockedObject, vi } from "vitest";
import { WhipClient } from "../WhipClient.js";
import { createMockMediaStream, createMockMediaStreamTrack, MockedMediaStreamTrack, MockRTCPeerConnection } from "../../testUtils.js";
import { createMockAudioContext, MockAudioContext } from "../../audio/testUtils.js";
import { WhipClientPlugin } from "../types.js";
import FakeTimers from "@sinonjs/fake-timers";

import { LogTracer, Logger, setTracer } from "../../index.js";

Logger.enable("*");

describe("WhipClient", () => {
  let audioTrack: MockedMediaStreamTrack;
  let videoTrack: MockedMediaStreamTrack;
  let client: WhipClient;
  let clock: FakeTimers.InstalledClock;
  beforeEach(() => {
    setTracer(new LogTracer());
    setupWhipWithoutPreflight();
    clock = FakeTimers.install();
  });
  afterEach(() => {
    clock.uninstall();
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
        request: vi.fn(),
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
    it("should call the plugins when a request is made", async () => {
      audioTrack = createMockMediaStreamTrack("audio");
      videoTrack = createMockMediaStreamTrack("video");
      const stream = createMockMediaStream([audioTrack, videoTrack]);
      // @ts-ignore
      plugin.request.mockImplementation((url, options) => {
        url.searchParams.set("foo", "bar");
        options.headers['X-Baz'] = "qux";
      });

      await client.start(stream);
      expect(plugin.request).toHaveBeenCalledWith(expect.toMatchURL(/^https:\/\/example.com\/whip/), expect.objectContaining({
        method: "POST",
        headers: expect.any(Object),
        body: expect.any(String),
      }));
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.toMatchURL(/^https:\/\/example.com\/whip\?foo=bar/), expect.objectContaining({
        headers: expect.objectContaining({
          "X-Baz": "qux",
        }),
      }));
    });
  })
  describe("prefer TCP ICE candidates", () => {
    let mockConn: any;
    describe.each([
      [
        "TCP and UDP remote candidates",
        "remove UDP candidates",
        "v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96 97\r\na=candidate:1 1 udp 2130706431 77.202.11.101 12345 typ host\r\na=candidate:2 1 tcp 3130706431 77.202.11.101 12345 typ host tcptype active\r\n",
        [
          /\ba=candidate:2 1 tcp 3130706431 77.202.11.101 12345 typ host tcptype active\b/,
        ],
        [/\ba=candidate:1 1 udp .*\b/m],
      ],
      [
        "only UDP remote candidates",
        "retain local UDP candidates",
        "v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96 97\r\na=candidate:1 1 udp 2130706431 77.202.11.101 12345 typ host\r\na=candidate:1 2 udp 2130706431 77.202.11.101 12345 typ host\r\n",
        [/\ba=candidate:1 1 udp 2130706431 77.202.11.101 12345 typ host\b/],
        [],
      ],

    ])("given %s", (_, m, sdpAnswer, expectedCandidates, unexpectedCandidates) => {
      beforeEach(async () => {
        audioTrack = createMockMediaStreamTrack("audio");
        videoTrack = createMockMediaStreamTrack("video");
        const stream = createMockMediaStream([audioTrack, videoTrack]);
        client = new WhipClient("https://example.com/whip", {
          canTrickleIce: true,
          icePreferTcp: true,
        });
        vi.spyOn(globalThis, "fetch")
          .mockReset()
          .mockResolvedValueOnce({
            ok: true,
            headers: new Headers({
              location: "https://m01.video.com/s/123",
            }),
            status: 200,
            text: () => Promise.resolve(sdpAnswer),
          } as any)
          .mockResolvedValueOnce({ // Trickling ICE candidates
            ok: true,
            headers: new Headers({
              'content-length': '0',
            }),
            status: 204,
            text: () => Promise.resolve(''),
          } as any);
        mockConn = new MockRTCPeerConnection();
        // @ts-ignore
        globalThis.RTCPeerConnection = vi.fn().mockReturnValue(mockConn);
        mockConn.getTransceivers.mockReturnValue([{
          mid: "0",
          receiver: {
            track: audioTrack,
          }
        }, {
          mid: "1",
          receiver: {
            track: videoTrack,
          }
        }])
        await client.start(stream as MediaStream);
      });
      it(`should ${m}`, () => {
        expectedCandidates.forEach((rx) => {
          expect(mockConn.setRemoteDescription).toHaveBeenCalledWith({
            type: "answer",
            sdp: expect.stringMatching(rx),
          });
        })
        unexpectedCandidates.forEach((rx) => {
          expect(mockConn.setRemoteDescription).toHaveBeenCalledWith({
            type: "answer",
            sdp: expect.not.stringMatching(rx),
          })
        });
      });
    });
    describe.each([
      [
        "TCP and UDP remote candidates",
        "filter out TURN servers with UDP transport",
        "v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96 97\r\na=candidate:1 1 udp 2130706431 77.202.11.101 12345 typ host\r\na=candidate:2 1 tcp 3130706431 77.202.11.101 12345 typ host tcptype active\r\n",
        [
          '<stun:ed-c16-95-128-175.fe.gc.onl:3478>; rel="ice-server"',
          '<turn:ed-c16-95-128-175.fe.gc.onl:443?transport=udp>; rel="ice-server"; username="1731402131:78bik80pk7jjljfpkb2j"; credential="BVHImLQFSd8ydncjdZprgkmGDBI="; credential-type="password"',
          '<turn:ed-c16-95-128-175.fe.gc.onl:443?transport=tcp>; rel="ice-server"; username="1731402131:i2znys9swwsat2vk3a5b"; credential="Nd7IuR7kRP/T/ANPvrG6i6jv/hw="; credential-type="password"',
          '<turn:ed-c16-95-128-175.fe.gc.onl:3478?transport=tcp>; rel="ice-server"; username="1731402131:y0w7tb10bqyl5d6zbuu0"; credential="Y38yn4BdsMeSWSOdoTo3GKj4ALk="; credential-type="password"',
        ],
        [
          {
            urls: ["stun:ed-c16-95-128-175.fe.gc.onl:3478"],
          },
          {
            urls: ["turn:ed-c16-95-128-175.fe.gc.onl:443?transport=tcp"],
            username: "1731402131:i2znys9swwsat2vk3a5b",
            credential: "Nd7IuR7kRP/T/ANPvrG6i6jv/hw=",
          },
          {
            urls: ["turn:ed-c16-95-128-175.fe.gc.onl:3478?transport=tcp"],
            username: "1731402131:y0w7tb10bqyl5d6zbuu0",
            credential: "Y38yn4BdsMeSWSOdoTo3GKj4ALk=",
          }
        ]
      ],
      [
        "only UDP remote candidates",
        "filter out TURN servers with UDP transport",
        "v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96 97\r\na=candidate:1 1 udp 2130706431 77.202.11.101 12345 typ host\r\na=candidate:2 1 tcp 3130706431 77.202.11.101 12345 typ host tcptype active\r\n",
        [
          '<stun:ed-c16-95-128-175.fe.gc.onl:3478>; rel="ice-server"',
          '<turn:ed-c16-95-128-175.fe.gc.onl:443?transport=udp>; rel="ice-server"; username="1731402131:78bik80pk7jjljfpkb2j"; credential="BVHImLQFSd8ydncjdZprgkmGDBI="; credential-type="password"',
          '<turn:ed-c16-95-128-175.fe.gc.onl:443?transport=tcp>; rel="ice-server"; username="1731402131:i2znys9swwsat2vk3a5b"; credential="Nd7IuR7kRP/T/ANPvrG6i6jv/hw="; credential-type="password"',
          '<turn:ed-c16-95-128-175.fe.gc.onl:3478?transport=tcp>; rel="ice-server"; username="1731402131:y0w7tb10bqyl5d6zbuu0"; credential="Y38yn4BdsMeSWSOdoTo3GKj4ALk="; credential-type="password"',
        ],
        [
          {
            urls: ["stun:ed-c16-95-128-175.fe.gc.onl:3478"],
          },
          {
            urls: ["turn:ed-c16-95-128-175.fe.gc.onl:443?transport=tcp"],
            username: "1731402131:i2znys9swwsat2vk3a5b",
            credential: "Nd7IuR7kRP/T/ANPvrG6i6jv/hw=",
          },
          {
            urls: ["turn:ed-c16-95-128-175.fe.gc.onl:3478?transport=tcp"],
            username: "1731402131:y0w7tb10bqyl5d6zbuu0",
            credential: "Y38yn4BdsMeSWSOdoTo3GKj4ALk=",
          }
        ]
      ]
    ])("given %s", (_, m, sdpAnswer, receivedIceServers, expectedIceServers) => {
      // TCP/UDP relay ICE servers
      beforeEach(async () => {
        audioTrack = createMockMediaStreamTrack("audio");
        videoTrack = createMockMediaStreamTrack("video");
        const stream = createMockMediaStream([audioTrack, videoTrack]);
        client = new WhipClient("https://example.com/whip", {
          canTrickleIce: true,
          icePreferTcp: true,
        });
        const headers = new Headers({
          location: "https://m01.video.com/s/123",
        });
        receivedIceServers.forEach((s, i) => {
          headers.append("link", s);
        });
        vi.spyOn(globalThis, "fetch")
          .mockReset()
          .mockResolvedValueOnce({
            ok: true,
            headers: headers,
            status: 200,
            text: () => Promise.resolve(sdpAnswer),
          } as any)
          .mockResolvedValueOnce({ // Trickling ICE candidates
            ok: true,
            headers: new Headers({
              'content-length': '0',
            }),
            status: 204,
            text: () => Promise.resolve(''),
          } as any);
        mockConn = new MockRTCPeerConnection();
        // @ts-ignore
        globalThis.RTCPeerConnection = vi.fn().mockReturnValue(mockConn);
        await client.start(stream as MediaStream);
      });
      it(`should ${m}`, () => {
        expect(mockConn.setConfiguration).toHaveBeenCalledWith(expect.objectContaining({
          iceServers: expectedIceServers,
        }))
      });
    });
  });
  describe.skip("replaceTrack", () => {
    // TODO
  });
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

interface CustomMatchers<R = unknown> {
  toMatchURL: (pattern: RegExp) => R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
  toMatchURL(received: URL, expected: RegExp) {
    const pass = expected.test(received.toString())
    return {
      message: () => `expected ${received} to match ${expected}`,
      pass,
    }
  },
});
