import type { types as ms } from "mediasoup-client";
import { EventEmitter } from "eventemitter3";

import type { SignalConnection } from "../signaling/types.js";
import { type RtcDataConsumerCreatedPayload } from "../msg/types.js";
import { RtcDataChannel } from "../RtcDataChannel.js";
import type { DataMediaLabel, RtcDataChannelMessage } from "../types.js";
import type { DataConsumerAppData, DataProducerAppData } from "./types.js";
import { RtcDataProducerCloseMessage } from "../msg/RtcDataProducerCloseMessage.js";
import { RtcLoopbackDataConsumerRequestMessage } from "../msg/RtcLoopbackDataConsumerRequestMessage.js";
import { RtcTransportConnectorT } from "./types.js";
import { RtcTransportConnectorEvents } from "./types.js";
import { reportError, trace } from "../trace/index.js";
import {
  DataChannelConnectFailedError,
  DataChannelOpenTimeoutError,
} from "./errors.js";

import { DC_OPEN_TIMEOUT } from "../settings.js";

/**
 * @internal
 */
export enum RtcDataChannelConnectorEvents {
  NewConsumer = "newconsumer",
}

const TRACE = "lib.rtckit.internal.RtcDataChannelConnector";

/**
 * Connects the client interface data channel object with the system
 * @internal
 */
export class RtcDataChannelConnector {
  private dataChan: RtcDataChannel | null = null;

  private dataConsumersMap: Map<string, ms.DataConsumer> = new Map();

  private dataProducer: ms.DataProducer | null = null;

  private emitter = new EventEmitter<{
    [RtcDataChannelConnectorEvents.NewConsumer]: (e: ms.DataConsumer) => void;
  }>();

  private ready: Promise<ms.DataProducer> | null = null;

  on = this.emitter.on.bind(this.emitter);
  off = this.emitter.off.bind(this.emitter);
  removeAllListeners = this.emitter.removeAllListeners.bind(this.emitter);

  constructor(
    public readonly label: DataMediaLabel,
    private conn: SignalConnection,
    private recvTransport: RtcTransportConnectorT,
    private sendTransport: RtcTransportConnectorT, // TODO use stub for non-producing setup
    producing: boolean
  ) {
    if (producing) {
      if (sendTransport.ready) {
        this.initDataProducer();
      }
      sendTransport.on(RtcTransportConnectorEvents.Ready, () =>
        this.initDataProducer()
      );
    }
  }

  get dataConsumers(): Iterable<ms.DataConsumer> {
    return this.dataConsumersMap.values();
  }

  async createDataConsumer(data: RtcDataConsumerCreatedPayload) {
    const t = await this.recvTransport.getObject(data.appData.transportId);
    const dataConsumer = await t.consumeData<DataConsumerAppData>(data);
    this.dataConsumersMap.set(dataConsumer.id, dataConsumer);
    // TODO on close remove
    // this emit is for RtcDataChannel
    this.emitter.emit(RtcDataChannelConnectorEvents.NewConsumer, dataConsumer);
  }

  get dataChannel(): RtcDataChannel {
    if (!this.dataChan) {
      this.dataChan = new RtcDataChannel(this);
    }
    return this.dataChan;
  }

  close() {
    if (this.dataProducer) {
      this.conn.dispatch(
        new RtcDataProducerCloseMessage(this.dataProducer.id).pack()
      );
      this.closeDataProducer(this.dataProducer);
    }
    this.dataConsumersMap.forEach((dc) => dc.close());
    this.dataConsumersMap.clear();
    this.emitter.removeAllListeners();
  }

  requestLoopback() {
    this.initDataProducer().then(
      (dataProducer) => this.dispatchLoopbackRequest(dataProducer),
      (e) => reportError(e)
    );
  }

  async send(data: RtcDataChannelMessage) {
    this.initDataProducer()
      .then((dataProducer: ms.DataProducer) => {
        dataProducer.send(data);
      })
      .catch((e) => {
        reportError(e);
      });
  }

  /**
   * @throws
   */
  private async initDataProducer(): Promise<ms.DataProducer> {
    if (!this.ready) {
      this.ready = new Promise((resolve, reject) => {
        this.sendTransport
          .getObject()
          .then((transport) => {
            return transport.produceData<DataProducerAppData>({
              label: this.label,
            });
          })
          .then((dataProducer) => {
            this.dataProducer = dataProducer;
            dataProducer.on("error", (e) => {
              reportError(new DataChannelConnectFailedError(e));
              this.closeDataProducer(dataProducer);
            });
            dataProducer.on("close", () => {
              trace(`${TRACE}.dataProducerClosed`);
              this.closeDataProducer(dataProducer);
            });
            dataProducer.on("open", () => {
              if (timer) {
                clearTimeout(timer);
              }
              resolve(dataProducer);
            });
            const timer = setTimeout(() => {
              this.ready = null;
              reject(new DataChannelOpenTimeoutError());
            }, DC_OPEN_TIMEOUT);
          })
          .catch((e) => {
            this.ready = null;
            reject(e);
          });
      });
    }
    return await this.ready;
  }

  private dispatchLoopbackRequest(dataProducer: ms.DataProducer) {
    this.conn.dispatch(
      new RtcLoopbackDataConsumerRequestMessage(dataProducer.id).pack()
    );
  }

  private closeDataProducer(dataProducer: ms.DataProducer) {
    dataProducer.close();
    this.dataProducer = null;
    this.ready = null;
  }
}
