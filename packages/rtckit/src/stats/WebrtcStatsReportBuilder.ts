import { MediaKind } from "../types.js";
import {
  WebrtcAudioConsumerStats,
  WebrtcAudioProducerStreamStats,
  WebrtcConciseReport,
  WebrtcConsumerStats,
  WebrtcProducerStreamStats,
  WebrtcTransportStats,
  WebrtcVideoConsumerStats,
  WebrtcVideoProducerStreamStats,
} from "./types.js";
import { logger } from "./utils.js";

type RTCMediaSourceStats = {
  trackIdentifier: string;
  kind: "video" | "audio";
  id: string;
  timestamp: DOMHighResTimeStamp;
  type: "media-source";
};

type RTCVideoSourceStats = RTCMediaSourceStats & {
  frames: number;
  framesPerSecond: number;
  height: number;
  width: number;
};

type RTCRemoteInboundRtpStreamStats = {
  id: string;
  type: "remote-inbound-rtp";
  localId: string;
  jitter: number;
  // TODO check
  jitterBufferDelay: number;
  jitterBufferTargetDelay: number;
  jitterBufferEmittedCount: number;
  jitterBufferMinimumDelay: number;

  fractionLost: number;
};

const T = "WebrtcStatsReportBuilder";

export class WebrtcStatsReportBuilder {
  private prevStats: WeakMap<RTCPeerConnection, RTCStatsReport> = new WeakMap();

  private prodCurrent: Array<WebrtcAudioProducerStreamStats | WebrtcVideoProducerStreamStats> = [];

  private consCurrent: Array<WebrtcAudioConsumerStats | WebrtcVideoConsumerStats> = [];

  private sendCurrent: Map<string, WebrtcTransportStats> = new Map();
  private recvCurrent: Map<string, WebrtcTransportStats> = new Map();

  async processStats(conn: RTCPeerConnection) {
    const prevReport = this.prevStats.get(conn);
    const report = await conn.getStats();
    await this.processSendStats(conn, report, prevReport);
    await this.processRecvStats(conn, report, prevReport);
    this.prevStats.set(conn, report);
  }

  getReport(): WebrtcConciseReport {
    const retval = {
      recv: {
        transports: Array.from(this.recvCurrent.values()),
        streams: this.consCurrent,
      },
      send: {
        transports: Array.from(this.sendCurrent.values()),
        streams: this.prodCurrent,
      },
    };
    this.prodCurrent = [];
    this.consCurrent = [];
    this.sendCurrent.clear();
    this.recvCurrent.clear();
    return retval;
  }

  private async processSendStats(
    conn: RTCPeerConnection,
    report: RTCStatsReport,
    prevReport: RTCStatsReport | undefined,
  ) {
    await Promise.all(
      conn.getSenders().map(async (sender) => {
        if (!sender.transport) {
          return;
        }
        if (!sender.track) {
          return;
        }
        const track = sender.track;
        const stats = await sender.getStats();
        for (const stat of stats.values()) {
          switch (stat.type) {
            case "outbound-rtp": {
              if (stat.mid === "probator") {
                logger.debug(`${T} processSendStats probator track, skipping`);
                // TODO check
                return;
              }
              const remoteStats = findRemoteInboundRtpStats(report, stat.id);
              if (track.kind === "video") {
                const msStats = findMediaSourceStats(
                  track.id,
                  report,
                ) as RTCVideoSourceStats | null;
                this.processOutboundVideoRtpStats(stat, remoteStats, msStats, prevReport);
              } else {
                this.processOutboundAudioRtpStats(stat, remoteStats, prevReport);
              }
              break;
            }
            case "candidate-pair":
              // TODO check if concurrent access is OK
              this.processSendTransportStats(stat); // rtt, abr
              break;
          }
        }
      }),
    );
  }

  private async processRecvStats(
    conn: RTCPeerConnection,
    report: RTCStatsReport,
    prevReport: RTCStatsReport | undefined,
  ) {
    await Promise.all(
      conn.getReceivers().map(async (receiver) => {
        const stats = await receiver.getStats();
        for (const stat of stats.values()) {
          switch (stat.type) {
            case "inbound-rtp": {
              if (stat.mid === "probator") {
                logger.debug(`${T} processRecvStats probator track, skipping`);
                // TODO check
                return;
              }
              if (stat.kind === "video") {
                // const remote
                this.processInboundVideoRtpStats(stat, prevReport);
              } else {
                this.processInboundAudioRtpStats(stat, prevReport);
              }
              break;
            }
            case "candidate-pair":
              this.processRecvTransportStats(stat);
              break;
          }
        }
      }),
    );
  }

  private processOutboundVideoRtpStats(
    stats: RTCOutboundRtpStreamStats,
    remoteStats: RTCRemoteInboundRtpStreamStats | null,
    msStats: RTCVideoSourceStats | null,
    prevReport: RTCStatsReport | undefined,
  ) {
    const prevStats = prevReport ? prevReport.get(stats.id) : null;
    const time = prevStats ? (stats.timestamp - prevStats.timestamp) * 1000 : 1; // seconds

    const fir = (stats.firCount || 0) - (prevStats?.firCount || 0) / time;
    const pli = (stats.pliCount || 0) - (prevStats?.pliCount || 0) / time;
    const vres = msStats?.height || 0;
    const fps = msStats?.framesPerSecond || 0;
    this.prodCurrent.push({
      ...producerStats(stats, prevStats, remoteStats, "video"),
      fir,
      pli,
      vres,
      fps,
    });
  }

  private processOutboundAudioRtpStats(
    stats: RTCOutboundRtpStreamStats,
    remoteStats: RTCRemoteInboundRtpStreamStats | null,
    prevReport: RTCStatsReport | undefined,
  ) {
    const prevStats = prevReport ? prevReport.get(stats.id) : null;
    this.prodCurrent.push(producerStats(stats, prevStats, remoteStats, "audio"));
  }

  private processInboundVideoRtpStats(
    stats: RTCInboundRtpStreamStats,
    prevReport: RTCStatsReport | undefined,
  ) {
    const prevStats = prevReport?.get(stats.id) as RTCInboundRtpStreamStats | null;
    this.consCurrent.push({
      ...consumerStats(stats, prevStats, "video"),
      fir: (stats.firCount || 0) - (prevStats?.firCount || 0),
      pli: (stats.pliCount || 0) - (prevStats?.pliCount || 0),
    });
  }

  private processInboundAudioRtpStats(
    stats: RTCInboundRtpStreamStats,
    prevReport: RTCStatsReport | undefined,
  ) {
    const prevStats = prevReport?.get(stats.id) as RTCInboundRtpStreamStats | null;
    this.consCurrent.push(consumerStats(stats, prevStats, "audio"));
  }

  private processSendTransportStats(stats: RTCIceCandidatePairStats) {
    this.processTransportStats(this.sendCurrent, stats);
  }

  private processTransportStats(ts: Map<string, WebrtcTransportStats>, stats: RTCIceCandidatePairStats) {
    if (ts.has(stats.transportId)) {
      return;
    }
    ts.set(stats.transportId, {
      abr: stats.availableOutgoingBitrate || 0,
      rtt: stats.currentRoundTripTime || 0,
    });
  }

  private processRecvTransportStats(stats: RTCIceCandidatePairStats) {
    this.processTransportStats(this.recvCurrent, stats);
  }
}

function findMediaSourceStats(trackId: string, report: RTCStatsReport): RTCMediaSourceStats | null {
  for (const stats of report.values()) {
    if (stats.type === "media-source" && stats.trackIdentifier === trackId) {
      return stats;
    }
  }
  return null;
}

function findRemoteInboundRtpStats(
  report: RTCStatsReport,
  id: string,
): RTCRemoteInboundRtpStreamStats | null {
  for (const stats of report.values()) {
    if (stats.type === "remote-inbound-rtp" && stats.localId === id) {
      return stats;
    }
  }
  return null;
}

function producerStats(
  stats: RTCOutboundRtpStreamStats,
  prevStats: RTCOutboundRtpStreamStats | null,
  remoteStats: RTCRemoteInboundRtpStreamStats | null,
  kind: MediaKind,
): WebrtcProducerStreamStats {
  const time = prevStats ? (stats.timestamp - prevStats.timestamp) * 1000 : 1; // seconds
  const nack = (stats.nackCount || 0) - (prevStats?.nackCount || 0) / time;
  const targetBitrate = stats.targetBitrate || 0;
  const traffic = (stats.bytesSent || 0) - (prevStats?.bytesSent || 0) / time;
  const jitter = remoteStats?.jitter || 0;
  const frlost = remoteStats?.fractionLost || 0;
  return {
    kind,
    nack,
    tbr: targetBitrate,
    traffic,
    jitter,
    frlost,
  };
}

function consumerStats(
  stats: RTCInboundRtpStreamStats,
  prevStats: RTCInboundRtpStreamStats | null,
  kind: MediaKind,
): WebrtcConsumerStats {
  const time = prevStats ? (stats.timestamp - prevStats.timestamp) * 1000 : 1; // seconds
  const nack = (stats.nackCount || 0) - (prevStats?.nackCount || 0) / time;
  const traffic = (stats.bytesReceived || 0) - (prevStats?.bytesReceived || 0) / time;
  const jitter = stats.jitter || 0; // TODO or jitterBufferDelay / jitterBufferEmittedCount
  const packetsLost = stats.packetsLost || 0;
  const packetsReceived = stats.packetsReceived || 0;
  const frlost = packetsLost && packetsReceived ? packetsLost / (packetsLost + packetsReceived) : 0;
  return {
    kind,
    jitter,
    nack,
    frlost,
    traffic,
  };
}
