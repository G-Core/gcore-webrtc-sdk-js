import type { RtcTransportDirection } from "../types.js";

export class DataChannelOpenTimeoutError extends Error {
  constructor() {
    super("Data channel opening has timed out");
  }
}

export class DataChannelConnectFailedError extends Error {
  constructor(e: unknown) {
    super(`Data channel connection has failed: ${e}`);
  }
}

export class DeviceInitFailedError extends Error {
  readonly data: Record<string, unknown>;

  constructor(routerId: string, e: unknown) {
    super(`Device init failed: ${e}`);
    this.data = {
      routerId,
    };
  }
}

export class TransportClosedError extends Error {
  constructor() {
    super("Transport is closed");
  }
}

export class TransportCreateTimeoutError extends Error {
  constructor() {
    super("Transport creation has timed out");
  }
}

export class TransportCreateAbortedError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class IceRestartFailedError extends Error {
  constructor(error: unknown) {
    super(`ICE restart failed: ${error}`);
  }
}

export class RemoteIceRestartFailedError extends Error {
  constructor(error: unknown) {
    super(`Remote ICE restart failed: ${error}`);
  }
}

export class DeviceNotReadyError extends Error {
  constructor() {
    super("Device is not ready");
  }
}

export class WrongTransportError extends Error {
  constructor() {
    super("Wrong transport");
  }
}

export class EndpointTransportCreateFailedError extends Error {
  constructor(error: unknown, dir: RtcTransportDirection, isPrimary?: boolean) {
    const prim = isPrimary ? "primary " : "";
    super(`Endpoint ${prim}${dir} transport create failed: ${error}`);
  }
}

export class RouterTransportCreateFailed extends Error {
  constructor(error: unknown) {
    super(`Router transport create failed: ${error}`);
  }
}

export class RestartFailedError extends Error {
  constructor() {
    super(`Restart failed`); // after N attempts
  }
}
