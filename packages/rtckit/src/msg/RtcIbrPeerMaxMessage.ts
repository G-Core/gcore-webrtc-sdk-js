import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcIbrPeerMaxMessage extends BaseMessage {
  constructor(peerId: string, value: number) {
    super(MessageType.RtcIbrPeerMax, {
      peerId,
      value,
    });
  }
}
