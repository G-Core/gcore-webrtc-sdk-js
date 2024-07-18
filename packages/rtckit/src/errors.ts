export enum ErrorCode {
  Generic = 0,
  RtcPeerNotRegistered = 1,
  RtcPermissionDenied = 2,
  RtcProducerNotFound = 3,
  RtcConsumerNotFound = 4,
  RtcTransportNotFound = 5,
  RtcEndpointCapsUnknown = 6,
  RtcDataProducerNotFound = 7,
  RtcDataConsumerNotFound = 8,
  Unauthorized = 100,
  WrongPin = 101,
  DoubleConnect = 102, // = peerAlreadyEntered
  SessionError = 103, // = invalid token
  SessionMismatch = 104, // TODO drop
  ConnectionError = 105, // = internal server error
  RoomNotFound = 106,
  WrongProtocol = 208,
}

/**
 * @param code
 * @returns  Whether it is a connection error (i.e., signaling connection failed to establish)
 */
export function isConnectionError(code: ErrorCode) {
  return code >= ErrorCode.Unauthorized;
}

type ServerErrorDto = {
  code: number;
  params?: Record<string, unknown>;
};

export type GenericServerResponse = {
  error?: ServerErrorDto;
};

/**
 * Comes from the SocketConnection.dispatch ack response
 */
export class ServerRequestError extends Error {
  constructor(message: string, readonly code: ErrorCode, readonly data?: Record<string, unknown>) {
    super(message);
  }

  static fromResponse(error: ServerErrorDto, op: string): ServerRequestError {
    const code = Number((error as ServerErrorDto).code);
    return new ServerRequestError(
      `Message(${op}) error code=${code}`,
      code,
      (error as ServerErrorDto).params
    );
  }
}

export class ReplaceStreamTrackFailedError extends Error {
  constructor(err: unknown) {
    super(`Failed to replace track: ${err}`);
  }
}

export class PauseRemoteStreamFailedError extends Error {
  constructor(err: unknown) {
    super(`Failed to pause remote stream: ${err}`);
  }
}

export class ResumeRemoteStreamFailedError extends Error {
  constructor(err: unknown) {
    super(`Failed to resume remote stream: ${err}`);
  }
}

export class SyncStreamStateFailedError extends Error {
  constructor(err: unknown) {
    super(`Failed to sync stream state: ${err}`);
  }
}

export class UnknownError extends Error {
  constructor(e: unknown, readonly data: Record<string, unknown> = {}) {
    super(`Unknown error: ${e}`);
  }
}

export class EventHandlerCrashedError extends Error {
  constructor(e: unknown, readonly data: Record<string, unknown> = {}) {
    super(`Event handler crashed: ${e}`);
  }
}

export class DataConsumerCreateFailedError extends Error {
  constructor(e: unknown, readonly data: Record<string, unknown> = {}) {
    super(`Data consumer create failed: ${e}`);
  }
}

export class RequestTestStreamFailedError extends Error {
  constructor(e: unknown, readonly data: Record<string, unknown> = {}) {
    super(`Request test stream failed: ${e}`);
  }
}