import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcPermissionSetMessage extends BaseMessage {
  constructor(label: string, peerId: string | null, allow: boolean) {
    super(MessageType.RtcPermissionSet, {
      label,
      peerId,
      allow,
    });
  }
}
