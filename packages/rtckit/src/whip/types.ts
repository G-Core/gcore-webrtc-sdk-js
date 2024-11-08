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
 * @public
 */
export interface WhipClientPlugin {
  /**
   * Is called when the client is closed
   */
  close(): void;
  /**
   * Is called when a peer connection is initialized
   * @param pc - The RTCPeerConnection to be used by the client
   */
  init(pc: RTCPeerConnection): void;

  /**
   * Is called on any WHIP request
   * @param url - WHIP request URL
   * @param options - the `fetch` request options, including method, headers and body
   * @remarks
   * Use `options`.`method` to determine the operation being performed, e.g., POST means session initialization
   */
  request(url: URL, options: RequestInit): void;
}

/**
 * Options affecting the behaviour of WhipClient
 * @public
 * @remarks
 * Set `canTrickleIce` if your media server supports [Trickle ICE](https://bloggeek.me/webrtcglossary/trickle-ice/).
 *   This will help to avoid sending a preflight OPTIONS request to learn about the ICE servers.
 *   That OPTIONS request is send when both canTrikleIce and iceServers are not set.
 * `icePreferTcp` will make the client prefer TCP transport over UDP.
 */
export type WhipClientOptions = {
  auth?: string;
  canRestartIce?: boolean;
  canTrickleIce?: boolean;
  encodingParameters?: RTCRtpEncodingParameters[];
  icePreferTcp?: boolean;
  iceServers?: RTCIceServer[];
  maxReconnects?: number;
  maxWhipRetries?: number;
  noRestart?: boolean;
  plugins?: WhipClientPlugin[];
  useHostIceCandidates?: boolean;
  videoCodecs?: Array<string | CodecMatch>;
  videoPreserveInitialResolution?: boolean;
};
