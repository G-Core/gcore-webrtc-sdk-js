import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class WaitingRoomSetMessage extends BaseMessage<MessageType> {
  constructor(state: boolean) {
    super(MessageType.WaitingRoomSet, {
      state,
    });
  }
}
