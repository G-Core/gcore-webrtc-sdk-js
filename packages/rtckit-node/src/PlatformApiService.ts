// Internal low-level code to interact with the Platform API

import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";

import { ErrorDetails, GcoreApiError } from "./errors.js";
import { AuthKey } from "./auth.js";

const PREFIX = "/streaming";

export type RequestOptions = {
  method?: string;
  headers?: Record<
    string,
    string | string[]
  >;
  data?: unknown;
};

export class PlatformApiService {
  constructor(
    private host: string,
    private auth: AuthKey,
  ) {}

  request<R>(
    endpoint: string,
    options?: RequestOptions,
  ): Promise<R> {
    return this.#fetch(
      endpoint,
      options,
    ).then(
      (r) => {
        return r.data;
      },
      (e) => {
        return Promise.reject(
          parseErrorResponse(e),
        );
      },
    );
  }

  #fetch(
    endpoint: string,
    options?: RequestOptions,
  ): Promise<AxiosResponse> {
    const url = `${this.host}${PREFIX}/${endpoint}`;
    const headers = new AxiosHeaders(
      options?.headers || {},
    );
    headers.setAccept("application/json", false);
    headers.setContentType("application/json", false);
    headers.setAuthorization(this.auth.toString(), false);
    const axOpts: AxiosRequestConfig = {
      url,
      method: options?.method || "get",
      headers,
      data: options?.data,
      responseType: "json",
    };

    return axios(axOpts);
  }
}

function parseErrorResponse(
  e: AxiosError,
) {
  if (e.response) {
    return new GcoreApiError(
      e.response.status,
      parseErrorBody(e.response.data),
    );
  }
  return e;
}

function parseErrorBody(body: unknown): ErrorDetails | undefined {
  if (
    !body ||
    typeof body !== "object"
  ) {
    return;
  }
  const errors =
    "errors" in body
      ? parseErrors(body.errors)
      : [];
  return {
    errors,
  };
}

function parseErrors(
  errors: unknown,
): string[] {
  if (!Array.isArray(errors)) {
    return [];
  }
  return errors.filter(
    (e) => typeof e === "string",
  );
}
