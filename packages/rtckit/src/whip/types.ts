export type CodecMatch = {
  codec: string;
  params?: Record<string, string>;
};

export type WhipClientOptions = {
  auth?: string;
  canRestartIce?: boolean;
  canTrickleIce?: boolean;
  iceServers?: RTCIceServer[];
  maxReconnects?: number;
  maxWhipRetries?: number;
  videoCodecs?: Array<string | CodecMatch>;
};
