import type { types as ms } from "mediasoup-client";
import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";

export class RtcTransportConnectMessage extends BaseMessage<MessageType.RtcTransportConnect> {
  constructor(
    id: string,
    dtlsParameters: ms.DtlsParameters,
    routerId?: string
  ) {
    super(MessageType.RtcTransportConnect, {
      id,
      dtlsParameters,
      routerId,
    });
  }
}
