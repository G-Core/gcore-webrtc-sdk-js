import { types as ms } from "mediasoup-client";
import { BaseMessage } from "./BaseMessage.js";
import { MessageType } from "./types.js";
import type { RtcTransportDirection } from "../types.js";

export type RtcTransportCreateOptions = {
  enableSctp?: boolean;
  forceTcp?: boolean;
  sctpCapabilities?: ms.SctpCapabilities;
};

export class RtcTransportCreateMessage extends BaseMessage {
  constructor(
    dir: RtcTransportDirection,
    options: RtcTransportCreateOptions = {}
  ) {
    super(MessageType.RtcTransportCreate, {
      dir,
      ...options,
    });
  }
}
