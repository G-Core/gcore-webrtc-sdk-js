import { types as ms } from "mediasoup-client";
import { EventEmitter } from "eventemitter3";

import type {  MsProducer } from "../msTypes.js";

import type {  SignalConnection } from "../signaling/types.js";

import {
  RtcOutgoingStreamOptions,
} from "../types.js";

import {
  type TransportProduceParameters,
  RtcProduceMessage,
} from "../msg/RtcProduceMessage.js";
import {
  RtcDataProduceMessage,
  type TransportProduceDataParameters,
} from "../msg/RtcDataProduceMessage.js";

import { type ProducerAppData, RtcTransportConnectorEvents, RtcTransportConnectorT } from "./types.js";

type TransportProduceCallback = (data: TransportProduceResponse) => void;

type TransportProduceDataCallback = (data: TransportProduceDataResponse) => void;

type GenericErrback = (e: Error) => void;

type TransportProduceResponse = { id: string };

type TransportProduceDataResponse = { id: string };

const TRACE = "lib.rtckit.internal.RtcSendTransportConnector";

/**
 * @internal
 */
export class RtcSendTransportConnector  {
  private emitter = new EventEmitter();

  on = this.emitter.on.bind(this.emitter);

  off = this.emitter.off.bind(this.emitter);

  constructor(private conn: SignalConnection, private connector: RtcTransportConnectorT) {
    connector.on(RtcTransportConnectorEvents.Created, (t) => this.bindTransportListeners(t));
  }

  public async produce(label: string, track: MediaStreamTrack, options?: RtcOutgoingStreamOptions): Promise<MsProducer> {
    const producer = await (await this.connector.getObject()).produce<ProducerAppData>({
      disableTrackOnPause: false,
      stopTracks: false,
      zeroRtpOnPause: true,
      ...options,
      track, // TODO test no clone
      appData: {
        label,
      },
    });
    return producer;
  }

  public async produceData(label: string) {
    // TODO remove this, is handled by RtcDataChannelConnector
  }

  private bindTransportListeners(t: ms.Transport) {
    t.on(
      "produce",
      (
        params: ms.TransportEvents["produce"][0],
        cb: TransportProduceCallback,
        eb: GenericErrback,
      ) => {
        this.conn.dispatch(
          new RtcProduceMessage(t.id, params as TransportProduceParameters).pack(),
          (err, resp) => {
            if (err) {
              eb(err);
            } else {
              cb(resp as TransportProduceResponse);
            }
          },
        );
      },
    );
    t.on(
      "producedata",
      (
        params: ms.TransportEvents["producedata"][0],
        cb: TransportProduceDataCallback,
        eb: GenericErrback,
      ) => {
        this.conn.dispatch(
          new RtcDataProduceMessage(t.id, params as TransportProduceDataParameters).pack(),
          (err, resp) => {
            if (err) {
              eb(err);
            } else {
              cb(resp as TransportProduceDataResponse);
            }
          },
        );
      },
    );
  }
}
