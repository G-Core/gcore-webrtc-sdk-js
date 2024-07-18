import { MessageDto as M } from "../msg/types.js";

export type MessageAck = (e?: Error | null, r?: unknown) => void;

export type MessageHandler = (m: M) => void;

export interface SignalConnection {
  readonly connected: boolean;
  close(): void;
  dispatch(m: M, cb?: MessageAck): void;
  on(event: SignalConnectionEvents, cb: (...args: unknown[]) => void): void;
  off(event: SignalConnectionEvents, cb: (...args: unknown[]) => void): void;
  subscribe(h: MessageHandler): void;
}

export type ConnectionParams = Record<string, string>;

export enum SignalConnectionEvents {
  Close = "close",
  Connect = "connect",
  Disconnect = "disconnect",
  Failure = "failure",
  Open = "open",
}
