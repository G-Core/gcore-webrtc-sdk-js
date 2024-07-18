import { BaseMessage } from "./BaseMessage.js";
import { DismissReason, MessageType } from "./types.js";

export class DismissMessage extends BaseMessage {
  constructor(
    peerId: string,
    reason: DismissReason = DismissReason.Moderation
  ) {
    super(MessageType.Dismiss, {
      peerId,
      reason,
    });
  }
}
