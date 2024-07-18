import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcLoopbackConsumerRequestMessage extends BaseMessage {
  constructor(producerId: string) {
    super(MessageType.RtcLoopbackConsumerRequest, {
      producerId,
    });
  }
}
