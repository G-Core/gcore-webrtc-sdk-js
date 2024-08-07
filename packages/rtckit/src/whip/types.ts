/**
 * @public
 */
export type CodecMatch = {
  codec: string;
  /**
   * @beta
   */
  params?: Record<string, string>;
};

/**
 * @public
 */
export type WhipClientOptions = {
  auth?: string;
  canRestartIce?: boolean;
  canTrickleIce?: boolean;
  iceServers?: RTCIceServer[];
  maxReconnects?: number;
  maxWhipRetries?: number;
  useHostIceCandidates?: boolean;
  videoCodecs?: Array<string | CodecMatch>;
};
