import {
  BackendError,
  AuthOptionUnavailableError,
  MalformedBackendResponseError,
  PinCodeCheckError,
} from "./errors.js";
import { ApiErrorCodes, AuthOption, PincodeErrorCodes, ExtendedUiConfig } from "./types.js";

/**
 * @internal
 */
export function createInitSessionError(
  e: unknown,
  attempted: AuthOption,
): AuthOptionUnavailableError | PinCodeCheckError | unknown {
  if (!(e instanceof BackendError) || e.status !== 403) {
    return e;
  }

  const code = e.data?.code;

  if (code && Object.values(PincodeErrorCodes).includes(code as PincodeErrorCodes)) {
    return new PinCodeCheckError(code as PincodeErrorCodes);
  }

  const authOptions = parseAuthOptions(e.data);

  return new AuthOptionUnavailableError(attempted, authOptions);
}

function parseAuthOptions(data: Record<string, unknown> | null): AuthOption[] | null {
  if (!data) {
    return null;
  }
  if (!data.authOptions) {
    return null;
  }
  if (!Array.isArray(data.authOptions)) {
    return null;
  }
  const ao = Object.values(AuthOption) as string[];
  return data.authOptions.filter(
    (item: unknown) => typeof item === "string" && ao.includes(item),
  ) as AuthOption[];
}

/**
 * @internal
 */
export function fetchErrorAware<R>(url: string, options?: RequestInit): Promise<R> {
  return fetch(url, options).then((r) => {
    if (r.ok) {
      return parseResponseBody<R>(r);
    }
    return Promise.resolve(parseResponseBody(r))
      .catch(() => null)
      .then((body) => Promise.reject(new BackendError(r.status, parseErrorBody(body), r.type)));
  });
}

/**
 * @internal
 */
export function validateLoadConfigResponse(resp: unknown): ExtendedUiConfig {
  if (!resp || typeof resp !== "object") {
    throw new MalformedBackendResponseError("Object expected");
  }
  const options = (resp as Record<string, unknown>).options;
  if (!options || typeof options !== "object") {
    throw new MalformedBackendResponseError('"options" field is missing');
  }

  return resp as ExtendedUiConfig;
}

export function isRetriableBackendError(error: unknown): boolean {
  return (
    error instanceof BackendError &&
    (error.status === 429 || error.status >= 500) &&
    error.data?.code !== ApiErrorCodes.BroadcasterError
  );
}

/**
 * @internal
 */
export async function fetchRetry<R>(
  fn: () => Promise<R>,
  retriesLeft = 11,
  delay = 150,
  maxDelay = 1000,
  retriable: (e: unknown) => boolean = isRetriableBackendError,
): Promise<R> {
  try {
    return await fn();
  } catch (error) {
    if (retriesLeft <= 0 || error instanceof MalformedBackendResponseError || !retriable(error)) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));

    const doubleDelay = delay * 2;
    const nextDelay = doubleDelay > maxDelay ? maxDelay : doubleDelay;
    const rnd = 0.75 + Math.random() * 0.5;
    return fetchRetry(fn, --retriesLeft, nextDelay * rnd);
  }
}

export function calcRetryDuration(duration: number): {
  delay: number;
  delayMax: number;
  retriesCount: number;
} {
  if (!duration) {
    // default ones, it amounts to ~10s total duration considering the RTT
    return {
      delay: 150,
      delayMax: 1000,
      retriesCount: 11,
    };
  }
  if (duration <= 10000) {
    const baseRetries = 3 + Math.floor(duration / 1000 - 1);
    return {
      delay: 150,
      delayMax: 1000,
      retriesCount: baseRetries,
    };
  }
  return {
    delay: 150,
    delayMax: 2000,
    retriesCount: 4 + Math.floor(duration / 2000 - 1),
  };
}

function parseResponseBody<R>(r: Response): Promise<R> {
  if (r.headers?.get("content-type")?.includes("application/json")) {
    return r.json();
  }
  // return r.text();
  return Promise.resolve({} as R);
}

function parseErrorBody(r: unknown): { code: number } {
  if (!r || typeof r !== "object") {
    return { code: 0 };
  }
  if ("code" in r && typeof r.code === "number") {
    return {
      code: r.code,
    };
  }
  return {
    code: 0,
  };
}
