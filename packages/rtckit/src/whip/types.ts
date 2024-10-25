/**
 * A codec match condition to filter the available codecs
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
 * Options affecting the behaviour of WhipClient
 * @public
 */
export type WhipClientOptions = {
  auth?: string;
  canRestartIce?: boolean;
  canTrickleIce?: boolean;
  iceServers?: RTCIceServer[];
  maxReconnects?: number;
  maxWhipRetries?: number;
  noRestart?: boolean;
  useHostIceCandidates?: boolean;
  videoCodecs?: Array<string | CodecMatch>;
  encodingParameters?: RTCRtpEncodingParameters[];
};
