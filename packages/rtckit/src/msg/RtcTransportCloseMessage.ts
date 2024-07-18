import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcTransportCloseMessage extends BaseMessage {
  constructor(id: string, routerId?: string) {
    super(MessageType.RtcTransportClose, {
      id,
      routerId,
    });
  }
}
