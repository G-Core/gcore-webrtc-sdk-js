import type { SessionConfig, SessionInitParams } from "./internal/api/types.js";
import { ApiService } from "./internal/ApiService.js";
import type { ApiClientConfig } from "./types.js";

/**
 * @internal
 */
export type SessionParams = Omit<SessionInitParams, "hostname">;

const DEFAULT_CONFIG = {
  host: "https://api.gcore.com/streaming/videocalls",
  clientHost: "meet.gcorelabs.com",
}

/**
 * @internal
 */
export class ApiClient {
  private service: ApiService;

  constructor(private config: ApiClientConfig) {
    this.service = new ApiService(this.config.host || DEFAULT_CONFIG.host);
  }

  initSession(params: SessionParams): Promise<SessionConfig> {
    return this.service.initSession({
      ...params,
      hostname: this.config.clientHost || DEFAULT_CONFIG.clientHost,
    });
  }
}
