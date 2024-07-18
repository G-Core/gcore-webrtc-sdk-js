import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcDataProducerCloseMessage extends BaseMessage {
  constructor(id: string) {
    super(MessageType.RtcDataProducerClose, {
      id,
    });
  }
}
