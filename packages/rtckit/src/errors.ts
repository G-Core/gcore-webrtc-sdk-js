/**
 * @public
 * @group Errors
 * Some erroneous sequence of operations, e.g.:
 * - attempt to double-produce/consume
 * - attempt to produce/consume when the client is closed
 */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * @public
 * @group Errors
 * WHIP/WHEP request returned a malformed response.
 * Possible reasons:
 * - misconfigured endpoint URL
 * - server-side configuration issues
 */
export class MalformedResponseError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, MalformedResponseError.prototype);
  }
}

/**
 * @public
 * @group Errors
 * Network error during a WHIP/WHEP API request.
 * Reasons:
 * - no internet connection
 * - network is unreachable (due to issues with a firewall, NAT, VPN, etc)
 * - server is down
 * - DNS resolution failed
 */
export class NetworkError extends Error {
  constructor(message = "unknown") {
    super(message);
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * @public
 * @group Errors
 * Any API server (WHIP, WHEP or any other) request error response, that is, 4xx and 5xx HTTP statuses.
 */
export class ServerRequestError extends Error {
  constructor(public readonly status: number, public readonly detail?: unknown) {
    super(`Server request failed with status ${status}`);
    Object.setPrototypeOf(this, ServerRequestError.prototype);
  }
}

/**
 * @public
 * @group Errors
 * Timeout, see the message for the details.
 * Operations that can timeout:
 * - waiting for the ICE candidates
 */
export class TimeoutError extends Error {
  constructor(msg = "Timeout") {
    super(msg);
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * A misbehavior of some internal logic.
 * Please report an issue https://github.com/G-Core/gcore-webrtc-sdk-js/issues.
 * @public
 * @group Errors
 */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, AssertionError.prototype);
  }
}
