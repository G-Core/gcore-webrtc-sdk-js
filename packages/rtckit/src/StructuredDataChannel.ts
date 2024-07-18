import { type RtcDataChannel } from "./RtcDataChannel.js";

function serializeDataMessage(m: Record<string, unknown>): string {
  return JSON.stringify(m);
}

type RawMessage = ArrayBuffer | Blob | string;

function parseDataMessage(m: RawMessage): Record<string, unknown> | undefined {
  if (typeof m !== "string") {
    console.error("parseDataMessage malformed");
    return;
  }
  try {
    return JSON.parse(m);
  } catch (e) {
    console.error(e);
  }
}

export class StructuredDataChannel<T extends Record<string, unknown>> {
  constructor(private dataChannel: RtcDataChannel) {}

  send(m: T) {
    this.dataChannel.send(serializeDataMessage(m));
  }

  subscribe(cb: (m: T) => void): () => void {
    return this.dataChannel.subscribe((raw: RawMessage) => {
      const parsed = parseDataMessage(raw);
      if (parsed) {
        cb(parsed as T);
      }
    });
  }
}
