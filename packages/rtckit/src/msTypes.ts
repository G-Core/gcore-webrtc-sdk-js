import { types as ms } from "mediasoup-client";

import type {
  ConsumerAppData,
  DataConsumerAppData,
  DataProducerAppData,
  ProducerAppData,
  TransportAppData
} from "./internal/types.js";

export type MsProducer = ms.Producer<ProducerAppData>;

export type MsConsumer = ms.Consumer<ConsumerAppData>;

export type MsDataConsumer = ms.DataConsumer<DataConsumerAppData>;

export type MsDataProducer = ms.DataProducer<DataProducerAppData>;

export type MsTransport = ms.Transport<TransportAppData>;