import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcRequestTestConsumerMessage extends BaseMessage {
  constructor(label: string, transportId: string) {
    super(MessageType.RtcTestConsumerRequest, {
      label,
      transportId,
    });
  }
}
