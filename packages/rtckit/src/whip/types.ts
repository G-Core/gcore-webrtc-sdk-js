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

export interface WhipClientPlugin {
  close(): void;
  init(pc: RTCPeerConnection): void;
}

/**
 * Options affecting the behaviour of WhipClient
 * @public
 */
export type WhipClientOptions = {
  auth?: string;
  canRestartIce?: boolean;
  canTrickleIce?: boolean;
  encodingParameters?: RTCRtpEncodingParameters[];
  iceServers?: RTCIceServer[];
  maxReconnects?: number;
  maxWhipRetries?: number;
  noRestart?: boolean;
  plugins?: WhipClientPlugin[];
  useHostIceCandidates?: boolean;
  videoCodecs?: Array<string | CodecMatch>;
  videoPreserveInitialResolution?: boolean;
  whipQueryParams?: Record<string, string>;
};
