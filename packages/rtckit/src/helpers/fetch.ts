import { NetworkError, ServerRequestError } from "../errors.js";
import { reportError } from "../trace/index.js";

const MIN_RETRY_DELAY = 500;
const MAX_RETRY_DELAY = 5000;
const START_RETRY_DELAY = 1000;

/**
 * @internal
 * @param f  Fetch operation
 * @param retriesLeft  Number of retries left
 * @param delay  Initial retry delay
 */
export function withRetries(
  f: () => Promise<Response>,
  retriesLeft = 100,
  delay = START_RETRY_DELAY,
  delayMax = MAX_RETRY_DELAY,
  abortSignal?: AbortSignal,
): Promise<Response> {
  return new Promise<void>((resolve) => {
    if (abortSignal) {
      abortSignal.throwIfAborted();
    }
    resolve();
  })
    .then(f)
    .then((resp: Response) => handleFetchResponse(resp))
    .catch((e) => {
      reportError(e);
      if (!canRetry(e)) {
        return Promise.reject(e);
      }
      if (!retriesLeft) {
        return Promise.reject(new NetworkError(e.message));
      }
      return new Promise((resolve, reject) => {
        const nextDelay = Math.min(
          delayMax,
          Math.max(MIN_RETRY_DELAY, delay * (0.75 + Math.random() * 0.5)),
        );
        setTimeout(() => {
          withRetries(f, retriesLeft - 1, delay * 2, delayMax, abortSignal)
            .then(resolve)
            .catch(reject);
        }, nextDelay);
      });
    });
}

function getResponseErrorDetail(resp: Response): Promise<unknown> {
  if (resp.headers.get("content-type")?.startsWith("application/json")) {
    return resp.json();
  }
  return Promise.resolve();
}

/**
 * @internal
 * @param resp
 * @returns
 */
export async function handleFetchResponse(resp: Response): Promise<Response> {
  if (!resp.ok) {
    return getResponseErrorDetail(resp).then(
      (detail: unknown) => Promise.reject(new ServerRequestError(resp.status, detail)),
      () => Promise.reject(new ServerRequestError(resp.status)),
    );
  }
  return resp;
}

/**
 * @internal
 * @param e
 * @returns
 */
function handleFetchErrorResponse(e: Error): Promise<never> {
  return Promise.reject(e instanceof TypeError ? new NetworkError(e.message) : e);
}

/**
 * @internal
 */
export function withErrorParser(f: () => Promise<Response>): Promise<Response> {
  return f().then(handleFetchResponse, handleFetchErrorResponse);
}

/**
 * @internal
 * @param duration
 * @returns
 */
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

function canRetry(e: Error): boolean {
  if (e instanceof TypeError) {
    // might be any network-level or a CORS error, in the former case it's retriable
    return true;
  }
  if (e instanceof ServerRequestError) {
    return [500, 502, 503, 504].includes(e.status);
  }
  return false;
}
