import { WhipClientPluginBase } from "./plugins.js";
import { trace } from "../trace/index.js";
import type { WhipClientPlugin } from "../whip/types.js";

const CHECK_INTERVAL = 1000;

/**
 * Describes the change of an outgoing stream video resolution
 * @beta
 * @remarks
 * - `ssrc` - The SSRC of the stream track
 * - `degraded` - If the resolution is degraded or recovered
 * - `width` - The current width of an encoded video frame
 * - `height` - The current height an encoded video frame
 * - `srcWidth` - The original width of the video track frame
 * - `srcHeight` - The original height of the video track frame
 */
export type VideoResolutionChangeEventData = {
  ssrc: number;
  degraded: boolean;
  width: number;
  height: number;
  srcWidth: number;
  srcHeight: number;
}

const T = "VideoResolutionChangeDetector";

/**
 * Detects the degradation and recovery of the outgoing stream video resolution
 * @beta
 */
export class VideoResolutionChangeDetector extends WhipClientPluginBase implements WhipClientPlugin {
  private timerId: number | null = null;

  private ssrcState: Record<number, { width: number; height: number }> = {};

  /**
   * @param onchange - The callback to be called when the resolution change is detected
   */
  constructor(private onchange: (data: VideoResolutionChangeEventData) => void) {
    super();
  }

  close() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * @param pc - A WebRTC Peer connection to watch
   */
  init(pc: RTCPeerConnection) {
    // TODO stop timer when the connection closes
    this.timerId = setInterval(() => {
      pc.getSenders()
        .filter(s => s.track && s.track.kind === "video")
        .forEach((s) => {
          const track = s.track as MediaStreamTrack;
          const { width, height } = track.getSettings();
          if (!width || !height) {
            return;
          }
          s.getStats().then(stats => {
            for (const report of stats.values()) {
              if (report.type === "outbound-rtp") {
                const {frameHeight, frameWidth, ssrc} = report as RTCOutboundRtpStreamStats;
                if (!frameWidth || !frameHeight) {
                  trace(`${T} no frame size`, {frameHeight, frameWidth, ssrc});
                  return;
                }
                this.detectStreamResolutionChange(ssrc, frameWidth, frameHeight, width, height);
              }
            }
          });
        })
    }, CHECK_INTERVAL);
  }

  private detectStreamResolutionChange(ssrc: number, width: number, height: number, srcWidth: number, srcHeight: number) {
    const degraded = width < srcWidth || height < srcHeight;
    const prevState = this.ssrcState[ssrc];
    this.ssrcState[ssrc] = {
      width,
      height,
    };
    if (!degraded && prevState?.width === srcWidth && prevState?.height === srcHeight) {
      return;
    }
    if (degraded && prevState?.width === width && prevState?.height === height) {
      return;
    }
    this.onchange({ ssrc, degraded, width, height, srcWidth, srcHeight });
  }
}
