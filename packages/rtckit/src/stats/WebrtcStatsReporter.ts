import { EventEmitter } from "eventemitter3";

import { WebrtcPeerConnectionWatcher } from "./WebrtcPeerConnectionWatcher.js";
import { WebrtcStatsReportBuilder } from "./WebrtcStatsReportBuilder.js";
import type { WebrtcConciseReport } from "./types.js";
import { logger } from "./utils.js";

const T = "WebrtcStatsReporter";

export class WebrtcStatsReporter {
  private interval = 1000;

  private intervalRef: number | undefined;

  private emitter = new EventEmitter<{
    report: (report: WebrtcConciseReport) => void;
  }>();

  private peerConnections: Set<RTCPeerConnection> = new Set();

  private statsBuilder = new WebrtcStatsReportBuilder();

  constructor(private watcher: WebrtcPeerConnectionWatcher) {}

  init() {
    this.watcher.init();

    this.watcher.subscribe((pc: RTCPeerConnection) => {
      this.peerConnections.add(pc);
      pc.addEventListener("connectionstatechange", () => {
        if (pc.connectionState === "closed") {
          this.peerConnections.delete(pc);
        }
      }, false);

      if (!this.intervalRef) {
        this.intervalRef = window.setInterval(async () => {
          await Promise.all(
            Array.from(this.peerConnections.values()).map(async (pc) => {
              if (pc.connectionState !== "connected") {
                if (pc.connectionState === "closed") {
                  this.peerConnections.delete(pc);
                }
                return;
              }
              await this.statsBuilder.processStats(pc);
            }),
          );
          const report = this.statsBuilder.getReport();
          if (this.isEmptyReport(report)) {
            return;
          }
          this.report(report);
        }, this.interval);
      }
    });
  }

  destroy() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = undefined;
    }
    this.emitter.removeAllListeners();
    this.peerConnections.clear();
  }

  subscribe(cb: (report: WebrtcConciseReport) => void) {
    this.emitter.on("report", cb);
  }

  private isEmptyReport(report: WebrtcConciseReport): boolean {
    return !(
      report.send.transports.length ||
      report.recv.transports.length ||
      report.send.streams.length ||
      report.recv.streams.length
    );
  }

  private report(report: WebrtcConciseReport) {
    this.emitter.emit("report", report);
  }
}
