import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class JoinRequestResolveMessage extends BaseMessage {
  constructor(ok: boolean, peerId?: string) {
    super(MessageType.JoinRequestResolve, {
      ok,
      peerId,
    });
  }
}
