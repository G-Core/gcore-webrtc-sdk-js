import type { types as ms } from "mediasoup-client";

export class CantStreamMediaException extends Error {
  constructor(public readonly kind: ms.MediaKind) {
    super(`Unable to stream ${kind}`);
    this.name = "CantStreamMediaException";
  }
}
