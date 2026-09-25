import { WhipClientPluginBase } from "./plugins.js";
import type { WhipClientPlugin } from "../whip/types.js";

const CHECK_INTERVAL = 1000;

/**
 * @beta
 */
export const enum StreamProfileEventType {
  FirstFrameSent = "first-frame-sent",
  FirstPacketAcknowledged = "first-packet-acknowledged",
}

/**
 * @beta
 */
export type StreamProfileEvent = {
  eventType: StreamProfileEventType;
  timestamp: DOMHighResTimeStamp;
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

  private firstFrameSentReported = false;

  private firstPacketAckedReported = false;

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
    this.timerId = setInterval(() => {
      pc.getSenders()
        .filter((s) => s.track && s.track.kind === "video")
        .forEach((s) => {
          s.getStats().then((stats) => {
            for (const report of stats.values()) {
              if (!this.firstFrameSentReported && report.type === "outbound-rtp") {
                const { framesSent = 0, timestamp } = report as RTCOutboundRtpStreamStats;
                if (framesSent >= 1) {
                  this.send({
                    eventType: StreamProfileEventType.FirstFrameSent,
                    timestamp,
                  });
                  this.firstFrameSentReported = true;
                  if (this.firstPacketAckedReported) {
                    this.stopPolling();
                    break;
                  }
                }
              }
              if (!this.firstPacketAckedReported && report.type === "remote-inbound-rtp") {
                const { packetsReceived = 0, timestamp } = report as RTCReceivedRtpStreamStats;
                if (packetsReceived > 0) {
                  this.send({
                    eventType: StreamProfileEventType.FirstPacketAcknowledged,
                    timestamp,
                  });
                  this.firstPacketAckedReported = true;
                  if (this.firstFrameSentReported) {
                    this.stopPolling();
                    break;
                  }
                }
              }
            }
          });
        });
    }, CHECK_INTERVAL);
  }

  private send(event: StreamProfileEvent) {
    queueMicrotask(() => {
      this.onevent(event);
    });
  }

  private stopPolling() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}
