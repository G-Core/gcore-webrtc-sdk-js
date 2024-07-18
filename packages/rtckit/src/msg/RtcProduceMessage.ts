import type { types as ms } from "mediasoup-client";

import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";
import type { ProducerAppData } from "../internal/types.js";

export type TransportProduceParameters = {
  kind: ms.MediaKind;
  rtpParameters: ms.RtpParameters;
  appData: ProducerAppData;
};

export class RtcProduceMessage extends BaseMessage {
  constructor(transportId: string, params: TransportProduceParameters) {
    super(MessageType.RtcProduce, {
      transportId,
      ...params,
    });
  }
}
