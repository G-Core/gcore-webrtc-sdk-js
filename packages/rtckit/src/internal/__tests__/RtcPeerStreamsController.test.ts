import { EventEmitter } from "node:events";
import { MockedFunction, beforeEach, describe, expect, it, vi } from "vitest";
import debug from "debug";

import { RtcPeerStreamsControllerT, RtcTransportConnectorT } from "../types";
import { RtcPeerStreamsController } from "../RtcPeerStreamsController";
import { getLabelMediaKind } from "../utils";
import {
  type MockedMsConsumer,
  type MockedTransportConnector,
  type MockedSignalConnection,
  type MockedMsTransport,
  createMockConnection,
  receiveConsumerCreated,
  createMockMediaStreamTrack,
  receiveServerMessage
} from "../../testUtils";
import { RtcMediaLabel } from "../../types";
import { MessageType } from "../../msg/types";
import { setTracer } from "../../trace/index";
import { LogTracer } from "../../trace/LogTracer";
import { resolve } from "node:path";

setTracer(new LogTracer());

describe("RtcPeerStreamsController", () => {
  let peerStreams: RtcPeerStreamsControllerT
  let conn: MockedSignalConnection;
  let consumer: MockedMsConsumer;
  let recv: MockedTransportConnector;
  let msRecvTransport: MockedMsTransport;
  beforeEach(() => {
    conn = createMockConnection();
    recv = createMockTransportConnector();
    peerStreams = new RtcPeerStreamsController(conn, recv as unknown as RtcTransportConnectorT);
  });
  describe("state sync", () => {
    beforeEach(async () => {
      debug.enable("*");
      msRecvTransport = createMockMsTransport();
      consumer = createMockMsConsumer();
      msRecvTransport.consume.mockResolvedValueOnce(consumer);
      recv.getObject.mockResolvedValue(msRecvTransport);
      receiveConsumerCreated({
        id: "consumer1",
        appData: { label: "video" },
      }, conn);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    describe.each([
      ["pause from paused", true, true, "pause"],
      ["pause from active", false, true, "pause"],
      ["resume from paused", true, false, "resume"],
      ["resume from active", false, false, "resume"],
    ])("%s", (_, currentPaused, nextPaused, methodName) => {
      let m: MockedFunction<() => void>;
      beforeEach(() => {
        consumer.paused = currentPaused;
        m = consumer[methodName as "pause" | "resume"];
        m.mockClear();
        receiveConsumerState(conn, consumer.id, nextPaused);
      });
      it(`should call ${methodName}`, () => {
        expect(m).toHaveBeenCalled();
      });
    });
  });
});

function createMockTransportConnector(): MockedTransportConnector {
  return Object.assign(new EventEmitter(), {
    getObject: vi.fn(),
    close: vi.fn(),
    setDevice: vi.fn(),
  }) as unknown as MockedTransportConnector;
}

function createMockMsTransport(appData = {}): MockedMsTransport {
  return Object.assign(new EventEmitter(), {
    appData,
    id: "transport1",
    close: vi.fn(),
    consume: vi.fn(),
    produce: vi.fn(),
    restartIce: vi.fn(),
  }) as MockedMsTransport;
}

function createMockMsConsumer(appData = {}): MockedMsConsumer {
  const label = RtcMediaLabel.Camera;
  const kind = getLabelMediaKind(label); // TODO
  return Object.assign(new EventEmitter(), {
    appData: {
      label,
      peerId: "peer1",
      producerPaused: false,
      routerId: "router1",
      transportId: "transport1",
      ...appData,
    },
    closed: false,
    id: "consumer1",
    kind,
    observer: new EventEmitter(),
    paused: false,
    producerId: "producer1",
    track: createMockMediaStreamTrack(kind),
    close: vi.fn(),
    getStats: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  }) as unknown as MockedMsConsumer;
}

function receiveConsumerState(conn: MockedSignalConnection, consumerId: string, paused: boolean) {
  receiveServerMessage({
    type: MessageType.RtcConsumerState,
    data: {
      id: consumerId,
      paused,
    }
  }, conn);
}
