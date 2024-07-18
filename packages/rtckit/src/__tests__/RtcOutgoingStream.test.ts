import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "eventemitter3";

import { type MsProducer } from "../msTypes";

import type { SignalConnection } from "../signaling/types";
import { RtcOutgoingStream } from "../RtcOutgoingStream";
import { createMockConnection, createMockProducer } from "../testUtils";
import type { MockedMsProducer, MockedSignalConnection } from "../testUtils";
import { RtcRecvTransportConnectorT } from "../internal/types";

describe("RtcOutgoingStream", () => {
  let stream: RtcOutgoingStream | undefined;
  let msProducer: MockedMsProducer;
  let conn: MockedSignalConnection;
  let recv: RtcRecvTransportConnectorT;
  beforeEach(() => {
    // @ts-ignore
    msProducer = createMockProducer("producer1", "video", { label: "video" });
    conn = createMockConnection();
    recv = Object.assign(new EventEmitter(), {
      getObject: vi.fn(),
      close: vi.fn(),
      setDevice: vi.fn(),
    }) as RtcRecvTransportConnectorT;
    stream = new RtcOutgoingStream(
      conn as unknown as SignalConnection,
      msProducer as MsProducer,
      // @ts-ignore
      recv
    );
  });
  describe("properties", () => {
    it.each([
      ["label", "video"],
      ["paused", false],
    ])("should expose %s", (prop: string, value: unknown) => {
      expect(stream![prop as keyof RtcOutgoingStream]).toEqual(value);
    });
  });
  describe("methods", () => {
    describe("close", () => {
      beforeEach(() => {
        conn.dispatch.mockImplementationOnce((_, cb) => cb && cb());
        stream!.close();
      });
      it("should signal the server", () => {
        expect(conn.dispatch).toHaveBeenCalledWith(
          {
            type: "r:closeProducer",
            data: {
              id: "producer1",
            },
          },
        );
      });
      it("should delegate to ms producer object", () => {
        expect(msProducer.close).toHaveBeenCalled();
      });
    });
    describe("pause", () => {
      describe("when paused", () => {
        beforeEach(() => {
          msProducer.paused = true;
          stream!.pause();
        });
        it("should do nothing", () => {
          expect(conn.dispatch).not.toHaveBeenCalledWith(
            expect.objectContaining({
              type: "r:toggleProducer",
              data: {
                id: "producer1",
                paused: true,
              },
            }),
          );
          expect(msProducer.pause).not.toHaveBeenCalled();
        });
      });
      describe("when running", () => {
        beforeEach(() => {
          msProducer.paused = false;
          conn.dispatch.mockImplementationOnce((m, cb) => cb && cb());
          stream!.pause();
        });
        it("should signal the server", () => {
          expect(conn.dispatch).toHaveBeenCalledWith(
            {
              type: "r:toggleProducer",
              data: {
                id: "producer1",
                paused: true,
              },
            },
            expect.any(Function),
          );
        });
        it("should call the local object", () => {
          expect(msProducer.pause).toHaveBeenCalled();
        });
      });
    });
    describe("resume", () => {
      describe("when paused", () => {
        beforeEach(() => {
          msProducer.paused = true;
          conn.dispatch.mockImplementationOnce((m, cb) => cb && cb());
          stream!.resume();
        });
        it("should signal the server", () => {
          expect(conn.dispatch).toHaveBeenCalledWith(
            {
              type: "r:toggleProducer",
              data: {
                id: "producer1",
                paused: false,
              },
            },
            expect.any(Function),
          );
        });
        it("should call local object", () => {
          expect(msProducer.resume).toHaveBeenCalled();
        });
      });
      describe("when running", () => {
        beforeEach(() => {
          msProducer.paused = false;
          stream!.resume();
        });
        it("should not signal", () => {
          expect(conn.dispatch).not.toHaveBeenCalledWith(
            {
              type: "r:toggleProducer",
              data: {
                id: "producer1",
                paused: false,
              },
            },
            expect.anything(),
          );
        });
      });
    });
    describe.skip("requestLoopback", () => {
      // TODO
    });
  });
  describe.skip("reactions", () => {
    // TODO
  });
});
