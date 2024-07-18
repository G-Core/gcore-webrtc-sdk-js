import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcMediaStopMessage extends BaseMessage {
  constructor(label: string, peerId: string | null) {
    super(MessageType.RtcMediaStop, {
      label,
      peerId,
    });
  }
}
