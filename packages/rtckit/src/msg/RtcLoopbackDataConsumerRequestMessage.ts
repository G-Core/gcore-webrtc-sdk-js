import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcLoopbackDataConsumerRequestMessage extends BaseMessage {
  constructor(id: string) {
    super(MessageType.RtcLoopbackDataConsumerRequest, {
      id,
    });
  }
}