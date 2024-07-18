import * as msClient from "mediasoup-client";
import { MockedFunction, beforeEach, describe, expect, it, vi } from "vitest";

import { RtcRouterConnector } from "../RtcRouterConnector";
import { 
  MockedSignalConnection,
  createMockConnection, createMockMsDevice, receiveServerMessage,
type MockedMsDevice,
} from "../../testUtils";
import { MessageType } from "../../msg/types";

describe("RtcRouterConnector", () => {
  let conn: MockedSignalConnection;
  let connector: RtcRouterConnector;
  let msDevice: MockedMsDevice;
  beforeEach(() => {
    conn = createMockConnection();
    msDevice = createMockMsDevice();
    vi.spyOn(msClient, "Device").mockReturnValue(msDevice as unknown as msClient.Device);
    connector = new RtcRouterConnector(conn);
  });
  describe("when router RTP caps arrive", () => {
    let onReady:MockedFunction<(arg: { device: msClient.Device, primary: boolean, routerId: string }) => void>;
    beforeEach(() => {
      onReady = vi.fn();
      connector.on("deviceReady", onReady);
      msDevice.sctpCapabilities = {
        numStreams: {
          MIS: 1024,
          OS: 1024,
        },
      };
      msDevice.rtpCapabilities = {
        codecs: [
          { mimeType: "audio/opus", kind: "audio", clockRate: 48000, channels: 2 },
          { mimeType: "video/VP8", kind: "video", clockRate: 90000, parameters: { "x-google-start-bitrate": 1000 }},
        ],
        headerExtensions: [
          { kind: "audio", uri: "urn:ietf:params:rtp-hdrext:sdes:mid", preferredId: 100 },
        ]
      };
      // TODO
      receiveServerMessage({
        type: MessageType.RtcRouterCaps,
        data: {
          routerId: "r1",
          rtpCapabilities: {
            codecs: [
              { mimeType: "audio/opus", kind: "audio", clockRate: 48000, channels: 2 },
              { mimeType: "video/VP8", kind: "video", clockRate: 90000, parameters: { "x-google-start-bitrate": 1000 }},
              { mimeType: "video/H264", kind: "video", clockRate: 90000, parameters: { "x-google-start-bitrate": 1000 }},
              { mimeType: "video/rtx", kind: "video", clockRate: 90000, preferredPayloadType: 102},
            ],
            headerExtensions: [
              { kind: "audio", uri: "urn:ietf:params:rtp-hdrext:sdes:mid", preferredId: 100 },
              { kind: "video", uri: "urn:ietf:params:rtp-hdrext:sdes:mid", preferredId: 101 },
            ],
          }
        }
      }, conn);
    });
    it("should init ms device", () => {
      expect(msClient.Device).toHaveBeenCalled();
      expect(msDevice.load).toHaveBeenCalledWith({
        routerRtpCapabilities: {
          codecs: [
            { mimeType: "audio/opus", kind: "audio", clockRate: 48000, channels: 2 },
            { mimeType: "video/VP8", kind: "video", clockRate: 90000, parameters: { "x-google-start-bitrate": 1000 }},
            { mimeType: "video/H264", kind: "video", clockRate: 90000, parameters: { "x-google-start-bitrate": 1000 }},
            { mimeType: "video/rtx", kind: "video", clockRate: 90000, preferredPayloadType: 102},
          ],
          headerExtensions: [
            { kind: "audio", uri: "urn:ietf:params:rtp-hdrext:sdes:mid", preferredId: 100 },
            { kind: "video", uri: "urn:ietf:params:rtp-hdrext:sdes:mid", preferredId: 101 },
          ],
        },
      });
    });
    it("should send endpoint caps", () => {
      expect(conn.dispatch).toHaveBeenCalledWith({
        type: "r:endpointCaps",
        data: {
          rtpCapabilities: msDevice.rtpCapabilities,
          sctpCapabilities: msDevice.sctpCapabilities,
        },
      });
    });
    it("should emit ready event", () => {
      expect(onReady).toHaveBeenCalledWith({
        device: msDevice,
        primary: true,
        routerId: "r1",
      });
    });
    it("should indicate ready state", () => {
      expect(connector.ready).toBe(true);
    })
  });
});