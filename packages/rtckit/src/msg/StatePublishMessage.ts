import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";
import { PrimitiveValue } from "../types.js";

export class StatePublishMessage extends BaseMessage {
  constructor(key: string, value: PrimitiveValue) {
    // TODO support on the backend
    super(MessageType.StatePublish, {
      key,
      value,
    });
  }
}
