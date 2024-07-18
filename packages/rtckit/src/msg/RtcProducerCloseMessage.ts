import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcProducerCloseMessage extends BaseMessage {
  constructor(id: string) {
    super(MessageType.RtcProducerClose, {
      id,
    });
  }
}
