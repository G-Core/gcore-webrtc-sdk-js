import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcConsumerToggleMessage extends BaseMessage<MessageType.RtcConsumerToggle> {
  constructor(id: string, on: boolean, routerId?: string) {
    super(MessageType.RtcConsumerToggle, {
      id,
      paused: !on,
      routerId,
    });
  }
}
