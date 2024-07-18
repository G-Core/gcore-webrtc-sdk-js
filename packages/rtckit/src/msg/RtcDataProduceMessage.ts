import type { types as ms } from "mediasoup-client";
import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";
import type { DataProducerAppData } from "../internal/types.js";
import { DataMediaLabel } from "@/types.js";

export type TransportProduceDataParameters<
  AppData = Record<string, never>
> = {
  appData: DataProducerAppData & AppData;
  label: DataMediaLabel;
  protocol: string;
  sctpStreamParameters: ms.SctpStreamParameters;
};

export class RtcDataProduceMessage extends BaseMessage {
  constructor(transportId: string, params: TransportProduceDataParameters) {
    super(MessageType.RtcDataProduce, {
      transportId,
      ...params,
    });
  }
}
