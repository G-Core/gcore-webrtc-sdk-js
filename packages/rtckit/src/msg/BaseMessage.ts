import type { MessageDto, MessagePayload, MessageType } from "./types.js";

export class BaseMessage<T extends MessageType = MessageType> {
  constructor(private type: T, private data: MessagePayload<T>) {}

  pack(): MessageDto<T> {
    return {
      type: this.type,
      data: this.data,
    };
  }
}
