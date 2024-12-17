import { MediaKind } from "../types.js";

/**
 * @alpha
 */
export type WebrtcReport = {
  transportInbound: {
    candidatePair: {
      currentRoundTripTime: number;
      availableOutgoingBitrate: number;
    } | null;

    calc: {
      bitrate: number;
    };

    bytesSent: number;
    bytesReceived: number;
  } | null;
  transportOutbound: {
    candidatePair: {
      currentRoundTripTime: number;
      availableOutgoingBitrate: number;
    } | null;

    calc: {
      bitrate: number;
    };

    bytesSent: number;
    bytesReceived: number;
  } | null;
  inboundRtp: {
    video: {
      calc: {
        bitrate: number;
      };
      frameWidth: number;
      frameHeight: number;
      framesPerSecond: number;
      bytesReceived: number;
      jitter: number;
      packetsLost: number;
    } | null;

    audio: {
      calc: {
        bitrate: number;
      };
      jitter: number;
      packetsLost: number;

      bytesReceived: number;
    } | null;
  } | null;

  remoteOutboundRtp: {
    video: {
      packetsSent: number;
    } | null;

    audio: {
      packetsSent: number;
    } | null;
  } | null;

  outboundRtp: {
    video: {
      calc: {
        bitrate: number;
      };

      bytesSent: number;
      frameWidth: number;
      frameHeight: number;
      framesPerSecond: number;
      packetsSent: number;
    } | null;

    audio: {
      calc: {
        bitrate: number;
      };
      bytesSent: number;
      packetsSent: number;
    } | null;
  } | null;

  remoteInboundRtp: {
    video: {
      packetsLost: number;
      jitter: number;
      roundTripTime: number;
    } | null;

    audio: {
      packetsLost: number;
      jitter: number;
      roundTripTime: number;
    } | null;
  } | null;
};

/**
 * @alpha
 */
export type WebrtcTransportStats = {
  abr: number; // Available bitrate in transport's direction, bps
  rtt: number; // seconds
};

/**
 * @alpha
 */
export type WebrtcStreamStats = {
  kind: MediaKind;
  jitter: number; // seconds
  nack: number;
  frlost: number; // (0, 1)
  traffic: number; // bytes
}

/**
 * @alpha
 */
export type WebrtcVideoStreamStats = WebrtcStreamStats & {
  fir: number;
  pli: number;
};

/**
 * @alpha
 */
export type WebrtcProducerStreamStats = WebrtcStreamStats & {
  tbr: number; // target bitrate, bps
}

/**
 * @alpha
 */
export type WebrtcVideoProducerStreamStats = WebrtcProducerStreamStats & WebrtcVideoStreamStats & {
  fps: number;
  vres: number; // px
};

/**
 * @alpha
 */
export type WebrtcAudioProducerStreamStats = WebrtcProducerStreamStats;

/**
 * @alpha
 */
export type WebrtcConsumerStats = WebrtcStreamStats;

/**
 * @alpha
 */
export type WebrtcVideoConsumerStats = WebrtcVideoStreamStats;

/**
 * @alpha
 */
export type WebrtcAudioConsumerStats = WebrtcStreamStats;

/**
 * @alpha
 */
export type WebrtcVideoProducerStats = WebrtcVideoProducerStreamStats;

/**
 * @alpha
 */
export type WebrtcConciseReport = {
  send: {
    streams: Array<WebrtcVideoProducerStreamStats | WebrtcAudioProducerStreamStats>;
    transports: WebrtcTransportStats[];
  };
  recv: {
    streams: Array<WebrtcVideoConsumerStats | WebrtcAudioConsumerStats>;
    transports: WebrtcTransportStats[];
  };
};

/**
 * @alpha
 */
export type WebrtcConciseReportDto = {
  server: string;
  data: WebrtcConciseReport;
}
