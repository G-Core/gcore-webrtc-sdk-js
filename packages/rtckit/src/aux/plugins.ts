import { WhipClientPlugin } from "../whip/types.js";

/**
 * @public
 */
export class WhipClientPluginBase implements WhipClientPlugin {
  public close() { }
  public init(_: RTCPeerConnection) { }
  public request(_: URL, __: RequestInit) { }
  public requestError(_: URL, __: RequestInit, ___: Error) { }
}
