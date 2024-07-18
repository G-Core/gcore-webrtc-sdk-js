import type { types as ms } from "mediasoup-client";
import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcEndpointCapsMessage extends BaseMessage {
  constructor(rtpCapabilities: ms.RtpCapabilities, sctpCapabilities: ms.SctpCapabilities) {
    super(MessageType.RtcEndpointCaps, {
      rtpCapabilities,
      sctpCapabilities,
    });
  }
}
