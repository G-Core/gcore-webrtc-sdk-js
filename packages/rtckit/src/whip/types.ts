export type CodecMatch = {
  codec: string;
  params?: Record<string, string>;
};

export type WhipClientOptions = {
  auth?: string;
  canRestartIce?: boolean;
  canTrickleIce?: boolean;
  iceServers?: RTCIceServer[];
  videoCodecs?: Array<string | CodecMatch>;
};