const CHECK_INTERVAL = 1000;

export type VideoResolutionChangeEventData = {
  ssrc: number;
  degraded: boolean;
  width: number;
  height: number;
  srcWidth: number;
  srcHeight: number;
}

export class VideoResolutionChangeDetector {
  private timerId: number | null = null;

  private ssrcState: Record<number, boolean> = {};

  constructor(private onchange: (data: VideoResolutionChangeEventData) => void) {}

  close() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  init(pc: RTCPeerConnection) {
    this.timerId = setInterval(() => {
      // console.log("Checking video resolution");
      pc.getSenders()
        .filter(s => s.track && s.track.kind === "video")
        .forEach((s) => {
          const track = s.track as MediaStreamTrack;
          const { width, height } = track.getSettings();
          // console.log(`Video resolution: ${width}x${height}`);
          if (!width || !height) {
            return;
          }
          s.getStats().then(stats => {
            // console.log("Got WebRTC stats for a sender");
            for (const report of stats.values()) {
              if (report.type === "outbound-rtp") {
                const {frameHeight, frameWidth, ssrc} = report as RTCOutboundRtpStreamStats;
                // console.log(`Outgoing video resolution: ${frameWidth}x${frameHeight}`);
                if (!frameWidth || !frameHeight) {
                  return; // TODO deside what to do in this case
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
    const curState = this.ssrcState[ssrc];
    this.ssrcState[ssrc] = degraded;
    if (!degraded && curState === undefined) {
      return;
    }
    if (degraded === curState) {
      return;
    }
    this.onchange({ ssrc, degraded, width, height, srcWidth, srcHeight });
  }
}
