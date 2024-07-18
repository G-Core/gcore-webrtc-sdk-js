import { types as ms } from "mediasoup-client";
import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export type RtcIceRestartMessageAck = ms.IceParameters;

export class RtcIceRestartMessage extends BaseMessage {
  constructor(transportId: string, routerId?: string) {
    super(MessageType.RtcIceRestart, {
      transportId,
      routerId,
    });
  }
}
