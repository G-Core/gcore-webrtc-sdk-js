import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcConsumerKeyFrameRequestMessage extends BaseMessage<MessageType.RtcConsumerKeyFrameRequest> {
  constructor(id: string, routerId?: string) {
    super(MessageType.RtcConsumerKeyFrameRequest, {
      id,
      routerId,
    });
  }
}
