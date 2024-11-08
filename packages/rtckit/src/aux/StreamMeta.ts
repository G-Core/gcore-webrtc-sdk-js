import { WhipClientPlugin } from "../whip/types.js";

/**
 * Adds stream's video track meta information (frame width and height) to a WHIP request query params
 * @beta
 */
export class StreamMeta implements WhipClientPlugin {
  private videoTrack: MediaStreamTrack | null = null;

  public close() { }

  public init(pc: RTCPeerConnection) {
    this.videoTrack = pc.getSenders()
      .map(s => s.track)
      .find(t => t?.kind === "video") || null;
  }

  public request(url: URL, options: RequestInit) {
    if (options.method !== "POST") {
      return;
    }
    if (!this.videoTrack) {
      return;
    }
    const { height, width } = this.videoTrack.getSettings();
    if (!height || !width) {
      return;
    }
    url.searchParams.set("width", width.toString());
    url.searchParams.set("height", height.toString());
  }
}
