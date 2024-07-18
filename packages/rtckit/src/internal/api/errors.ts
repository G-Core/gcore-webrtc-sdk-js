import { PincodeErrorCodes, type AuthOption } from "./types.js";

export class BackendError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: { code?: number } | null,
    type: string
  ) {
    super(`Status ${status} type=${type}`);
    this.name = "BackendError";
  }
}

export class AuthOptionUnavailableError extends Error {
  constructor(
    public readonly attempted: AuthOption,
    public readonly authOptions: AuthOption[] | null
  ) {
    super(`Option ${attempted} available=${authOptions}`);
    this.name = "AuthOptionUnavailableError";
  }
}

export class PinCodeCheckError extends Error {
  constructor(public readonly code: PincodeErrorCodes) {
    super("Pin code check failed");
    this.name = "PinCodeCheckError";
  }
}

export class MalformedBackendResponseError extends Error {
  constructor(expected: string) {
    super(expected);
    this.name = "MalformedBackendResponseError";
  }
}
