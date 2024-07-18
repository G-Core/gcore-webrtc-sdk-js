import type { types as ms } from "mediasoup-client";

import type { DataMediaLabel, RtcDataChannelMessage } from "./types.js";
import { type MsDataConsumer } from "./msTypes.js";
import {
  RtcDataChannelConnector,
  RtcDataChannelConnectorEvents,
} from "./internal/RtcDataChannelConnector.js";

import { reportError, trace } from "./trace/index.js";

type RtcDataChannelSubscriber = (data: RtcDataChannelMessage) => void;

class DataConsumerError extends Error {
  constructor(e: unknown) {
    super(`Consumer error: ${e}`);
  }
}

class DataChannelSubcriberError extends Error {
  constructor(e: unknown) {
    super(`Data channel subscriber error: ${e}`);
  }
}

const TRACE = "lib.rtckit.RtcDataChannel";

export class RtcDataChannel {
  private subscribers: RtcDataChannelSubscriber[] = [];

  constructor(private dcm: RtcDataChannelConnector) {
    dcm.on(
      RtcDataChannelConnectorEvents.NewConsumer,
      (consumer: ms.DataConsumer) => {
        trace(`${TRACE}.newConsumer`, {
          label: this.label,
          consumerId: consumer.id,
        });
        this.bindConsumerListeners(consumer);
      }
    );
    for (const dc of dcm.dataConsumers) {
      this.bindConsumerListeners(dc);
    }
  }

  get label(): DataMediaLabel {
    return this.dcm.label;
  }

  async send(data: RtcDataChannelMessage) {
    await this.dcm.send(data);
  }

  close() {
    this.dcm.close();
    this.subscribers.splice(0, this.subscribers.length);
  }

  requestLoopback() {
    this.dcm.requestLoopback();
  }

  subscribe(cb: RtcDataChannelSubscriber) {
    this.subscribers.push(cb);
    return () => {
      const i = this.subscribers.indexOf(cb);
      if (i >= 0) {
        this.subscribers.splice(i, 1);
      }
    };
  }

  private propagate(data: RtcDataChannelMessage) {
    this.subscribers.slice().forEach((s) => {
      try {
        s(data);
      } catch (e) {
        reportError(new DataChannelSubcriberError(e));
      }
    });
  }

  private bindConsumerListeners(consumer: ms.DataConsumer) {
    consumer.on("message", (data) => this.propagate(data));
    consumer.on("error", (e) => {
      reportError(new DataConsumerError(e));
    });
  }
}
