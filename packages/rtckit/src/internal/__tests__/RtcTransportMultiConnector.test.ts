import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { types as ms } from "mediasoup-client";
import { WrongTransportError } from "../errors";
import { RtcTransportMultiConnector } from "../RtcTransportMultiConnector";
import {
  createMockConnection,
  createMockMsDevice,
  createMockTransport,
  receiveTransportCreated,
  type MockedSignalConnection,
  MockedMsDevice,
  MockedMsTransport,
} from "../../testUtils";
import { RtcTransportDirection } from "../../types";
import { setTracer } from "../../trace";
import { LogTracer } from "../../trace/LogTracer";

import FakeTimers, { type InstalledClock } from "@sinonjs/fake-timers";

setTracer(new LogTracer());

describe("RtcTransportMultiConnector", () => {
  let clock: InstalledClock;
  let connector: RtcTransportMultiConnector;
  let conn: MockedSignalConnection;
  let msDevice: MockedMsDevice;
  let msTransport: MockedMsTransport;
  beforeEach(() => {
    msDevice = createMockMsDevice();
    msTransport = createMockTransport("transport1");
    msDevice.createRecvTransport.mockReturnValue(msTransport);
    conn = createMockConnection();
    connector = new RtcTransportMultiConnector(
      conn,
      RtcTransportDirection.Recv,
      {
        restartOnFail: true,
      }
    );
    clock = FakeTimers.install();
    connector.addRouter(msDevice as unknown as ms.Device, "router1");
  });
  afterEach(() => {
    clock.uninstall();
  });
  describe("getObject", () => {
    let p: Promise<ms.Transport>;
    describe("when transportId is not specified", () => {
      beforeEach(() => {
        p = connector.getObject();
      });
      it("should wait for primary transport", async () => {
        receiveTransportCreated(
          {
            dir: RtcTransportDirection.Recv,
            routerId: "router1",
            id: "transport1",
          },
          conn
        );
        await expect(p).resolves.toBe(msTransport);
      });
    });
    describe("when transportId is specified", () => {
      beforeEach(() => {
        receiveTransportCreated(
          {
            dir: RtcTransportDirection.Recv,
            routerId: "router2",
            id: "transport1",
          },
          conn
        );
      });
      describe("when transport is not found", () => {
        beforeEach(() => {
          p = connector.getObject("transport3");
        });
        it("should reject", async () => {
          await expect(p).rejects.toThrow(WrongTransportError);
        });
      });
      describe("when transport is found", () => {
        beforeEach(() => {
          p = connector.getObject("transport1");
        });
        it("should resolve", async () => {
          await expect(p).resolves.toBe(msTransport);
        });
      });
    });
  });
  describe("non-primary ICE restart", () => {
    beforeEach(() => {
      receiveTransportCreated(
        {
          routerId: "router2",
          id: "transport1",
          dir: RtcTransportDirection.Recv,
        },
        conn
      );
    });
    describe("transport is disconnected", () => {
      beforeEach(() => {
        msTransport.emit("connectionstatechange", "disconnected");
        conn.dispatch.mockImplementationOnce((_, ack) => {
          ack && ack();
        });
      });
      it("should restart ICE after a delay", () => {
        expect(conn.dispatch).not.toHaveBeenCalledWith(
          {
            type: "r:iceRestart",
            data: expect.anything(),
          },
          expect.any(Function)
        );
        expect(msTransport.restartIce).not.toHaveBeenCalled();
        clock.tick(3000);
        expect(msTransport.restartIce).toHaveBeenCalled();
        expect(conn.dispatch).toHaveBeenCalledWith(
          {
            type: "r:iceRestart",
            data: {
              transportId: "transport1",
            },
          },
          expect.any(Function)
        );
      });
    });
  });
  describe("non-primary transport failure", () => {
    beforeEach(() => {
      msDevice.createRecvTransport.mockReset().mockImplementationOnce(() => {
        throw new Error("Device is not ready");
      });
      receiveTransportCreated(
        {
          routerId: "router2",
          id: "transport1",
          dir: RtcTransportDirection.Recv,
        },
        conn
      );
    });
    it("should not close remote transport", () => {
      expect(conn.dispatch).not.toHaveBeenCalledWith({
        type: "r:transportClose",
        data: expect.objectContaining({
          id: "transport1",
        }),
      });
    });
    it("should not try to recreate transpoirt", () => {
      clock.tick(3000);
      expect(conn.dispatch).not.toHaveBeenCalledWith(
        {
          type: "r:transportCreate",
          data: expect.anything(),
        },
        expect.any(Function)
      );
      expect(conn.dispatch).not.toHaveBeenCalledWith(
        {
          type: "r:transportCreate",
          data: expect.anything(),
        },
        expect.any(Function)
      );
    });
  });
});
