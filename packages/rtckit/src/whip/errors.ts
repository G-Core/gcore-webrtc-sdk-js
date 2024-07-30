export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class MalformedResponseError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class NetworkError extends Error {
  constructor(message = "Network error") {
    super(message);
  }
}

export class ReconnectAttemptsExceededError extends Error {
  constructor() {
    super("Reconnect attempts exceeded");
  }
}

export class ServerRequestError extends Error {
  constructor(public readonly status: number, public readonly detail?: unknown) {
    super(`Server request failed with status ${status}`);
    Object.setPrototypeOf(this, ServerRequestError.prototype);
  }
}

export class SessionClosedError extends Error {
  constructor() {
    super("Session closed on media server");
  }
}

export class TimeoutError extends Error {
  constructor(msg = "Timeout") {
    super(msg);
  }
}

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
  }
}
