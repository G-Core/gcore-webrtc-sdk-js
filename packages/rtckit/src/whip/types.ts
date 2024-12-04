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

  requestError(url: URL, options: RequestInit, error: Error): void;
}

/**
 * Options affecting the behaviour of WhipClient
 * @public
 * @remarks
 * - `auth` - Authentication token to be passed via the `Authorization` header with every WHIP request
 *
 * - `canTrickleIce` - Allow the client to use {@link https://bloggeek.me/webrtcglossary/trickle-ice/ | Trickle ICE}
 *   if the media server supports it.
 *   This will help avoid sending a preflight OPTIONS request to learn about the ICE servers.
 *   That OPTIONS request is sent when both `canTrickleIce` and `iceServers` are not set.
 *   On by default
 *
 * - `canRestartIce` - Server supports ICE restarts. When it does, automatic restarts after connection failures will be faster
 *
 * - `encodingParameters` - The {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/setParameters#encodings | encoding parameters} to be used for the video tracks
 *
 * - `icePreferTcp` - Will make the client prefer TCP transport over UDP
 *
 * - `iceServers` - Explicitly set {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#iceservers | ICE servers}
 *    if the media server doesn't provide any.
 *    When `canTrickleIce` is off and `iceServers` are not set, the client will send a preflight OPTIONS request to learn about
 * the ICE servers before it can start ICE candidates gathering
 *
 * - `iceTransportPolicy` - {@link https://w3c.github.io/webrtc-pc/#dom-rtcconfiguration-icetransportpolicy | ICE transport policy}
 *    Set to `relay` to only use TURN servers
 *
 * - `maxReconnects` - The maximum number of reconnection attempts on WebRTC connection failure
 *
 * - `maxWhipRetries` - The maximum number of retries on WHIP requests
 *
 * - `noRestart` - Disables ICE restarts
 *
 * - `plugins` - An array of plugins to be used by the client. See {@link WhipClientPlugin}
 *   Example plugins: {@link StreamMeta}, {@link VideoResolutionChangeDetector}
 *
 * - `useHostIceCandidates` - Allow the use of the {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCIceCandidate/type#host | host}
 * ICE candidates.
 *    This might be useful for local development: the client will wait for the first host candidate to be gathered before starting
 * the session,  otherwise it might get stuck (for example, if there are no ICE servers configured).
 *    For the production environment, local host candidates basically have no use, as they lack connectivity
 *
 * - `videoCodecs` - An array of codec to restrict the codec used to send a video stream. See {@link CodecMatch}
 *
 * - `videoPreserveInitialResolutio` - An optimization cue for a browser to preserve the initial resolution of a video track which
 * can lead to better quality further on
 */
export type WhipClientOptions = {
  auth?: string;
  canRestartIce?: boolean;
  canTrickleIce?: boolean;
  debug?: boolean;
  encodingParameters?: RTCRtpEncodingParameters[];
  icePreferTcp?: boolean;
  iceServers?: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  maxReconnects?: number;
  maxWhipRetries?: number;
  noRestart?: boolean;
  plugins?: WhipClientPlugin[];
  useHostIceCandidates?: boolean;
  videoCodecs?: Array<string | CodecMatch>;
  videoPreserveInitialResolution?: boolean;
};
