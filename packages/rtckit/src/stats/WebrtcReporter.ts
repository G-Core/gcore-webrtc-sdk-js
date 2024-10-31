import { WebrtcPeerConnectionWatcher } from "./WebrtcPeerConnectionWatcher.js";
import { WebrtcStatsReporter } from "./WebrtcStatsReporter.js";
import type { WebrtcConciseReport } from "./types.js";
import { logger } from "./utils.js";

const T = "WebrtcReporter";

/**
 * @alpha
 */
export type WebrtcReportSender = (report: WebrtcConciseReport) => Promise<void>;

/**
 * @alpha
 */
export class WebrtcReporter {
  private watcher = new WebrtcPeerConnectionWatcher();

  private reporter = new WebrtcStatsReporter(this.watcher);

  constructor(private send: WebrtcReportSender) {}

  init() {
    this.reporter.init();
    this.reporter.subscribe(this.onWebrtcStatsReport);
  }

  destroy() {
    this.watcher.destroy();
    this.reporter.destroy();
  }

  protected onWebrtcStatsReport = (report: WebrtcConciseReport) => {
    this.sendReport(report);
  }

  private async sendReport(report: WebrtcConciseReport) {
    try {
      await this.send(report);
    } catch (e) {
      logger.error(`${T} sendReport`, e);
    }
  }
}
