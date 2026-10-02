import { trace } from "@gcorevideo/utils";

import { WhipClientPluginBase } from "./plugins.js";
import type { WhipClientPlugin } from "../whip/types.js";

const CHECK_INTERVAL = 1000;

const MAX_POLLING_DURATION = 60000; // 60 seconds

const T = "rtckit.aux.StreamProfiler";

/**
 * @beta
 */
export const enum StreamProfileEventType {
  FirstFrameSent = "first-frame-sent",
  FirstPacketAcknowledged = "first-packet-acknowledged",
  PacketLoss = "packet-loss",
  VideoTrackAcknowledged = "video-track-acknowledged",
}

/**
 * @beta
 * @remark
 * delta - time elapsed since the previous event (in milliseconds).
 *   The first event counts from the time connection is established.
 */
export type StreamProfileEvent = {
  eventType: StreamProfileEventType;
  timestamp: DOMHighResTimeStamp;
  delta: number;
};

/**
 * Is used to record time of certain events in a stream to debug timing-related issues.
 * It works by inspecting WebRTC stats and detects:
 * - first iframe sent in a stream for a video track (timestamp)
 * - the fact of a packet acknowledgement by the remote peer
 * @beta
 */
export class StreamProfiler extends WhipClientPluginBase implements WhipClientPlugin {
  private timerId: number | null = null;

  private firstFrameSent = false;

  private packetAcknowledged = false;

  private videoTrackAcked = false;

  private prevTimestamp: DOMHighResTimeStamp = 0;

  /**
   * @param onchange - The callback to be called when the resolution change is detected
   */
  constructor(private onevent: (event: StreamProfileEvent) => void) {
    super();
  }

  close() {
    this.stopPolling();
  }

  /**
   * @param pc - A WebRTC Peer connection to watch
   */
  init(pc: RTCPeerConnection) {
    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "connected") {
        this.startPolling(pc);
      }
    });
  }

  private startPolling(pc: RTCPeerConnection) {
    const setAt = Date.now();
    this.prevTimestamp = setAt;
    this.timerId = setInterval(() => {
      pc.getSenders()
        .filter((s) => s.track && s.track.kind === "video")
        .forEach((s) => {
          s.getStats().then((stats) => {
            for (const report of stats.values()) {
              if (report.type === "outbound-rtp") {
                if (!this.firstFrameSent) {
                  const { framesSent = 0, timestamp } = report as RTCOutboundRtpStreamStats;
                  if (framesSent >= 1) {
                    this.send(StreamProfileEventType.FirstFrameSent, timestamp);
                    this.firstFrameSent = true;
                  }
                }
                continue;
              }
              if (report.type === "remote-inbound-rtp") {
                const {
                  fractionLost = 0,
                  packetsReceived = 0,
                  roundTripTimeMeasurements = 0,
                  timestamp,
                } = report as RTCReceivedRtpStreamStats as any;
                if (packetsReceived > 0 && !this.packetAcknowledged) {
                  this.send(StreamProfileEventType.FirstPacketAcknowledged, timestamp);
                  this.packetAcknowledged = true;
                }
                if (roundTripTimeMeasurements > 0 && !this.videoTrackAcked) {
                  this.send(StreamProfileEventType.VideoTrackAcknowledged, timestamp);
                  this.videoTrackAcked = true;
                }
                if (fractionLost) {
                  this.send(StreamProfileEventType.PacketLoss, timestamp);
                }
                continue;
              }
              if (report.type === "inbound-rtp") {
                trace(`${T} Inbound RTP report`, {
                  report,
                });
                continue;
              }
            }
          });
        });
      const elapsed = Date.now() - setAt;
      if (elapsed > MAX_POLLING_DURATION) {
        trace(`${T} Stopping polling`, {
          elapsed,
        });
        this.stopPolling();
      }
    }, CHECK_INTERVAL);
  }

  private send(eventType: StreamProfileEventType, timestamp: DOMHighResTimeStamp) {
    queueMicrotask(() => {
      this.onevent({
        eventType,
        timestamp,
        delta: timestamp - this.prevTimestamp,
      });
      this.prevTimestamp = timestamp;
    });
  }

  private stopPolling() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
