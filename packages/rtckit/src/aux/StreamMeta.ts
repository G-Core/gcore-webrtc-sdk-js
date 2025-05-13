import { WhipClientPlugin } from "../whip/types.js";

import { WhipClientPluginBase } from "./plugins.js";

/**
 * Adds stream's video track meta information (frame width and height) to a WHIP request query params
 * @beta
 */
export class StreamMeta extends WhipClientPluginBase implements WhipClientPlugin {
  private videoTrack: MediaStreamTrack | null = null;

  constructor(private meta: Record<string, string | number | boolean> = {}) {
    super();
  }

  public init(pc: RTCPeerConnection) {
    this.videoTrack = pc.getSenders()
      .map(s => s.track)
      .find(t => t?.kind === "video") || null;
  }

  public addMeta(key: string, value: string | number | boolean) {
    this.meta[key] = value;
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
    Object.entries(this.meta).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }
}
