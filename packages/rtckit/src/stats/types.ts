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

export type WebrtcTransportStats = {
  abr: number; // Available bitrate in transport's direction, bps
  rtt: number; // seconds
};

export type WebrtcStreamStats = {
  kind: MediaKind;
  jitter: number; // seconds
  nack: number;
  frlost: number; // (0, 1)
  traffic: number; // bytes
}

export type WebrtcVideoStreamStats = WebrtcStreamStats & {
  fir: number;
  pli: number;
};

export type WebrtcProducerStreamStats = WebrtcStreamStats & {
  tbr: number; // target bitrate, bps
}


export type WebrtcVideoProducerStreamStats = WebrtcProducerStreamStats & WebrtcVideoStreamStats & {
  fps: number;
  vres: number; // px
};

export type WebrtcAudioProducerStreamStats = WebrtcProducerStreamStats;

export type WebrtcConsumerStats = WebrtcStreamStats;

export type WebrtcVideoConsumerStats = WebrtcVideoStreamStats;

export type WebrtcAudioConsumerStats = WebrtcStreamStats;

export type WebrtcVideoProducerStats = WebrtcVideoProducerStreamStats;

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

export type WebrtcConciseReportDto = {
  server: string;
  data: WebrtcConciseReport;
}

export type MediaKind = "audio" | "video";
