import { calcRetryDuration, withErrorParser, withRetries } from "../helpers/fetch.js";

import { SessionConfig, SessionInitParams } from "./api/types.js";

/**
 * @internal
 */
export class ApiService {
  #apiHost: string;

  constructor(apiHost: string) {
    this.#apiHost = apiHost;
  }

  #callApi<R>(endpoint: string, options?: RequestInit): Promise<Response> {
    const apiUrl = `${this.#apiHost}/${endpoint}`;
    return withErrorParser(() => fetch(apiUrl, options));
  }

  async initSession(
    params: SessionInitParams,
    extraParams?: Record<string, string>,
  ): Promise<SessionConfig> {
    // TODO move isParticipant, webinar, pincode to extraParams
    const {
      token,
      hostname,
      roomId,
      peerId,
      isParticipant,
      webinar,
      pincode,
      retryDuration = 0,
    } = params;
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

    const { delay, delayMax, retriesCount } = calcRetryDuration(retryDuration);

    return withRetries(
      () => this.#callApi(`sessions/init?${queryParams}`, options),
      retriesCount,
      delay,
      delayMax,
    ).then((resp) => resp.json());
  }

  request<R extends Record<string, string>>(endpoint: string, options?: RequestInit): Promise<R> {
    return this.#callApi<R>(endpoint, options).then((r) => r.json());
  }
}
