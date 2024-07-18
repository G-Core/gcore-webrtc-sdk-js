import { BackendError } from "./api/errors.js";
import {
  AuthOption,
  ChatAuthTokenEntity,
  CheckStreamEntity,
  ExtendedUiConfig,
  SessionConfig,
  SessionInitParams,
  StreamEntity,
} from "./api/types.js";
import {
  calcRetryDuration,
  createInitSessionError,
  fetchErrorAware,
  fetchRetry,
  validateLoadConfigResponse,
} from "./api/utils.js";

export class ApiService {
  #apiHost: string;

  constructor(apiHost: string) {
    this.#apiHost = apiHost;
  }

  #callApi<R>(endpoint: string, options?: RequestInit): Promise<R> {
    const apiUrl = `${this.#apiHost}/${endpoint}`;
    return fetchErrorAware<R>(apiUrl, options);
  }

  async getAssetFile(id: string): Promise<ArrayBuffer> {
    const apiUrl = `${this.#apiHost}/assets/file/${id}`;

    const resp = await fetch(apiUrl, { method: "GET" });

    return resp.arrayBuffer();
  }

  async createAsset(
    buffer: ArrayBuffer,
    sessionToken: string
  ): Promise<{ id: string }> {
    const formData = new FormData();
    const apiUrl = `${this.#apiHost}/sessions/attachments`;
    const headers = {
      authorization: `Bearer ${sessionToken}`,
    };

    formData.append(
      "content",
      new File([buffer], "presentation.pdf", { type: "application/pdf" })
    );

    return fetchErrorAware(apiUrl, { method: "POST", body: formData, headers });
  }

  async getConfig(hostname: string): Promise<ExtendedUiConfig> {
    const resp = await this.#loadConfig(hostname);
    return resp;
  }

  async getSessionConfig(token: string): Promise<SessionConfig> {
    return fetchRetry(
      () => this.#callApi<SessionConfig>("sessions/config", {
        headers: {
          authorization: `Bearer ${token}`,
        }
      })
    );
  }

  async initSession(params: SessionInitParams, extraParams?: Record<string, string>): Promise<SessionConfig> {
    // TODO move isParticipant, webinar, pincode to extraParams
    const { token, hostname, roomId, peerId, isParticipant, webinar, pincode, retryDuration = 0 } =
      params;
    const headers = token ? { authorization: `Bearer ${token}` } : undefined;
    const options = { headers, method: "POST" };

    const queryParams = new URLSearchParams({ hostname, roomId });

    if (peerId) queryParams.set("peerId", peerId);
    if (webinar) queryParams.set("webinar", "1");
    if (isParticipant) queryParams.set("isParticipant", "1");
    if (pincode) queryParams.set("pincode", pincode);

    if (extraParams) {
      Object.entries(extraParams).forEach(([key, value]) => queryParams.set(key, value));
    }

    const {
      delay,
      delayMax,
      retriesCount
    } = calcRetryDuration(retryDuration);

    return fetchRetry(
      () => this.#callApi<SessionConfig>(`sessions/init?${queryParams}`, options),
      retriesCount,
      delay,
      delayMax,
    ).catch((e) => {
      const attemptedOption = token ? AuthOption.Token : AuthOption.Anonymous;
      return Promise.reject(createInitSessionError(e, attemptedOption));
    });
  }

  async #loadConfig(hostname: string): Promise<ExtendedUiConfig> {
    const queryParams = `hostname=${hostname}`;
    const resp = await fetchRetry(() =>
      this.#callApi(`get-config?${queryParams}`)
    );
    const result = validateLoadConfigResponse(resp);
    return result;
  }

  async getChatAuthToken(token: string): Promise<ChatAuthTokenEntity> {
    return fetchRetry<ChatAuthTokenEntity>(() =>
      this.#callApi<ChatAuthTokenEntity>("chat/auth", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
        }
      }),
      undefined,
      undefined,
      undefined,
      (e: unknown) => e instanceof BackendError && ([401, 403, 429].includes(e.status) || e.status >= 500)
    );
  }

  async getStreamRecordingStatus(token: string): Promise<CheckStreamEntity> {
    return fetchRetry<CheckStreamEntity>(() =>
      this.#callApi<CheckStreamEntity>("sessions/recording-status", {
        headers: {
          authorization: `Bearer ${token}`,
        }
      })
    );
  }

  async toggleStreamRecording(
    token: string,
    state: boolean
  ): Promise<StreamEntity> {
    const options: RequestInit = {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ state }),
    };

    return fetchRetry<StreamEntity>(() =>
      this.#callApi<StreamEntity>(
        "sessions/recording-toggle",
        options
      )
    );
  }

  call<R>(endpoint: string, options?: RequestInit): Promise<R> {
    return this.#callApi<R>(endpoint, options);
  }
}
