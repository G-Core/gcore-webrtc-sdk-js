import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcConsumerPriorityMessage extends BaseMessage<MessageType.RtcConsumerPriority> {
  constructor(id: string, priority: number, routerId?: string) {
    super(MessageType.RtcConsumerPriority, {
      id,
      priority,
      routerId,
    });
  }
}
