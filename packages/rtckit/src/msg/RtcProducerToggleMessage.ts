import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcProducerToggleMessage extends BaseMessage {
  constructor(producerId: string, paused: boolean) {
    super(MessageType.RtcProducerToggle, {
      id: producerId,
      paused,
    });
  }

  static pause(producerId: string): RtcProducerToggleMessage {
    return new RtcProducerToggleMessage(producerId, true);
  }

  static resume(producerId: string): RtcProducerToggleMessage {
    return new RtcProducerToggleMessage(producerId, false);
  }
}
