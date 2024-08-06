/**
 * @beta
 * Number of reconnect attempts exceeded.
 * Reconects happen automatically when a WebRTC session is abruptly closed.
 */
export class ReconnectAttemptsExceededError extends Error {
  constructor() {
    super("Reconnect attempts exceeded");
    Object.setPrototypeOf(this, ReconnectAttemptsExceededError.prototype);
  }
}

/**
 * @beta
 * An attemt to use a session closed on the server side.
 * Media server can close a session on its discretion because of:
 * - inactivity (expired ICE consent)
 */
export class SessionClosedError extends Error {
  constructor() {
    super("Session closed on media server");
    Object.setPrototypeOf(this, SessionClosedError.prototype);
  }
}