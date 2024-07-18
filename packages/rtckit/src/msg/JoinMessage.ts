import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class JoinMessage extends BaseMessage {
  constructor() {
    super(MessageType.Join, {});
  }
}
