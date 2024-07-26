import { PlatformApiService } from "./PlatformApiService.js";
import { API_HOST } from "./settings.js";
import { AuthKey } from "./auth.js";
import { WebrtcApi } from "./WebrtcApi.js";

/**
 * Exposes a limited set of the Platform API methods
 */
export class GcoreApi {
  private service: PlatformApiService;

  public readonly webrtc: WebrtcApi;

  constructor(auth: AuthKey, host?: string) {
    this.service =
      new PlatformApiService(host || API_HOST, auth);
    this.webrtc = new WebrtcApi(this.service);
  }
}
