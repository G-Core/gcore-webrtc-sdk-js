import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcConsumerLayersSetMessage extends BaseMessage<MessageType.RtcConsumerLayersSet> {
  constructor(
    id: string,
    spatialLayer: number,
    temporalLayer: number,
    routerId?: string
  ) {
    super(MessageType.RtcConsumerLayersSet, {
      id,
      spatialLayer,
      temporalLayer,
      routerId,
    });
  }
}
