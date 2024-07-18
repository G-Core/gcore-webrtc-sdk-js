import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class DisplayNameChangeMessage extends BaseMessage<MessageType> {
  constructor(displayName: string) {
    super(MessageType.DisplayNameChange, {
      displayName,
    });
  }
}
