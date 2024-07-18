import { encode } from "cbor-x";

import { WebrtcPeerConnectionWatcher } from "./WebrtcPeerConnectionWatcher.js";
import { WebrtcStatsReporter } from "./WebrtcStatsReporter.js";
import type { WebrtcConciseReport } from "./types.js";
import { ApiService } from "@/internal/ApiService.js";
import { logger } from "./utils.js";

const T = "WebrtcReporter";

export class WebrtcReporter {
  private token: string | undefined;

  private watcher = new WebrtcPeerConnectionWatcher();

  private reporter = new WebrtcStatsReporter(this.watcher);

  constructor(public readonly api: ApiService, private mediaServer?: string) {}

  init(token: string) {
    this.token = token;
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
      await this.api.call("sessions/webrtc-stats", {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/senml+cbor",
        },
        body: encode({
          server: this.mediaServer,
          data: report,
        }),
      });
    } catch (e) {
      logger.error(`${T} sendReport`, e);
    }
  }
}
