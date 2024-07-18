import FakeTimers, { InstalledClock } from "@sinonjs/fake-timers";
import { types as ms } from "mediasoup-client";
import { MockedFunction, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setTracer } from "../../trace";
import { LogTracer } from "../../trace/LogTracer";
import { RtcTransportConnector } from "../RtcTransportConnector";
import { MockedMsDevice, MockedMsTransport, MockedSignalConnection, createMockConnection, createMockMsDevice, createMockTransport, receiveTransportCreated } from "../../testUtils";
import { RtcTransportDirection } from "../../types";
import { MsTransport } from "../../msTypes";

setTracer(new LogTracer());

describe("RtcTransportConnector", () => {
  let clock: InstalledClock;
  let conn: MockedSignalConnection;
  let connector: RtcTransportConnector;
  let msDevice: MockedMsDevice;
  let msTransport: MockedMsTransport;
  let onCreated: MockedFunction<(t: ms.Transport) => void>;
  let onReady: MockedFunction<() => {}>;
  beforeEach(() => {
    clock = FakeTimers.install();
    conn = createMockConnection();
    msDevice = createMockMsDevice();
    connector = new RtcTransportConnector(conn, RtcTransportDirection.Send, {
      restartOnFail: true,
    });
    msDevice.loaded = true;
    msDevice.sctpCapabilities = {
      numStreams: {
        OS: 100,
        MIS: 100,
      }
    };
    msTransport = createMockTransport("transport1", {});
    connector.addRouter(msDevice as unknown as ms.Device);
    onCreated = vi.fn();
    onReady = vi.fn();
    connector.on("created", onCreated);
    connector.on("ready", onReady);
  });
  afterEach(() => {
    clock.uninstall();
  });
  describe("starting", () => {
    beforeEach(() => {
      connector.start();
    });
    describe("successfully", () => {
      it("should create remote transport", () => {
        expect(conn.dispatch).toHaveBeenCalledWith({
          type: "r:transportCreate",
          data: expect.objectContaining({
            dir: "send",
            sctpCapabilities: {
              numStreams: {
                OS: 100,
                MIS: 100,
              }
            }
          })
        },
        expect.any(Function))
      });
      describe("after receiving server response", () => {
        beforeEach(() => {
          msDevice.createSendTransport.mockReturnValueOnce(msTransport);
          receiveTransportCreated({
            dir: RtcTransportDirection.Send,
            dtlsParameters: {
              fingerprints: [],
            },
            iceCandidates: [{
              address: "1.1.100.200",
              foundation: "a",
              priority: 32000,
              ip: "1.1.100.200",
              protocol: "udp",
              port: 9832,
              type: "host"
            }],
            iceParameters: {
              usernameFragment: "u",
              password: "p",
            },
            id: "transport1",
            routerId: "router1",
            sctpParameters: {
              port: 11100,
              OS: 100,
              MIS: 200,
              maxMessageSize: 4096
            }
          }, conn)
        });
        it("should create an endpoint transport", () => {
          expect(msDevice.createSendTransport).toHaveBeenCalledWith(expect.objectContaining({
            dtlsParameters: {
              fingerprints: [],
            },
            iceCandidates: [{
              address: "1.1.100.200",
              foundation: "a",
              priority: 32000,
              ip: "1.1.100.200",
              protocol: "udp",
              port: 9832,
              type: "host"
            }],
            iceParameters: {
              usernameFragment: "u",
              password: "p",
            },
            id: "transport1",
            sctpParameters: {
              port: 11100,
              OS: 100,
              MIS: 200,
              maxMessageSize: 4096
            }
          }));
        });
        it("should emit event", () => {
          expect(onCreated).toHaveBeenCalledWith(msTransport);
          expect(onReady).toHaveBeenCalled();
        });
      });
    })
    // TODO
  //   describe("when remote creation fails", () => {
  //     beforeEach(() => {
  //       onFailed = vi.fn();
  //       transport.on("failed", onFailed);
  //     });
  //     describe.each([
  //       [
  //         "on server side",
  //         () => {
  //           conn.dispatch.mockReset().mockImplementationOnce(({ type }, ack) => {
  //             if (type === "r:transportCreate") {
  //               ack(new Error("Internal server error"));
  //             } else {
  //               ack(null, {});
  //             }
  //           });
  //         },
  //         0,
  //       ],
  //       [
  //         "due to network delays",
  //         () => {
  //           conn.dispatch.mockReset().mockImplementationOnce((_, ack) => {
  //             setTimeout(() => ack(null, {}), 4000);
  //           });
  //         },
  //         3000,
  //       ],
  //     ])("%s", (_, setup, delay) => {
  //       beforeEach(() => {
  //         setup();
  //         transport.start();
  //         clock.tick(delay);
  //       });
  //       it("should not create local transport", () => {
  //         expect(msDevice.createRecvTransport).not.toHaveBeenCalled();
  //       });
  //       // TODO check, clarify the behavior
  //       it("should not emit `failed` event", () => {
  //         expect(onFailed).not.toHaveBeenCalled();
  //       });
  //       describe("after 10 initial attempt have failed", () => {
  //         beforeEach(async () => {
  //           conn.dispatch.mockReset().mockImplementation(({ type }, ack) => {
  //             if (type === "r:transportCreate") {
  //               setTimeout(() => ack(new Error("Internal server error")), 1000);
  //             } else {
  //               ack && ack(null);
  //             }
  //           });
  //           await clock.tickAsync(40000);
  //         });
  //         it("should fire `failed` event", () => {
  //           expect(onFailed).toHaveBeenCalled();
  //         });
  //         describe("restarting deliberately", () => {
  //           beforeEach(() => {
  //             newMsTransport = createMockMsTransport("transport3");
  //             conn.dispatch
  //               .mockReset()
  //               .mockImplementation((_, ack) => ack && ack(null));
  //             msDevice.createRecvTransport
  //               .mockClear()
  //               .mockReturnValueOnce(newMsTransport);
  //             transport.start();
  //           });
  //           it("should create router transport", () => {
  //             expect(conn.dispatch).toHaveBeenCalledWith(
  //               {
  //                 type: "r:transportCreate",
  //                 data: expect.anything(),
  //               },
  //               expect.any(Function)
  //             );
  //           });
  //           it("should create endpoint transport", () => {
  //             receiveTransportCreated({ dir, id: "transport3" }, conn);
  //             expect(msDevice.createRecvTransport).toHaveBeenCalledWith(
  //               expect.objectContaining({
  //                 id: "transport3",
  //               })
  //             );
  //           });
  //           it("should emit `ready` event", () => {
  //             receiveTransportCreated({ dir, id: "transport3" }, conn);
  //             expect(onReady).toHaveBeenCalled();
  //           });
  //         });
  //       });
  //       describe("after successful restart attempt", () => {
  //         beforeEach(() => {
  //           conn.dispatch.mockReset().mockImplementation((_, ack) => {
  //             ack && ack(null);
  //           });
  //           clock.tick(3000);
  //           receiveTransportCreated({ appData: {}, dir, id: "transport2" }, conn);
  //         });
  //         it("should create endpoint transport", () => {
  //           expect(msDevice.createRecvTransport).toHaveBeenCalledWith(
  //             expect.objectContaining({
  //               id: "transport2",
  //             })
  //           );
  //         });
  //         it("should emit `ready` event", () => {
  //           expect(onReady).toHaveBeenCalled();
  //         });
  //       });
  //     });
  //   });
  //   describe("when local transport creation fails", () => {
  //     beforeEach(async () => {
  //       onFailed = vi.fn();
  //       transport.on("failed", onFailed);
  //       msDevice.createRecvTransport.mockReset().mockImplementation(() => {
  //         throw new Error("Failed to initialize mediasoup transport");
  //       });
  //       await clock.tickAsync(0);
  //       receiveTransportCreated({ dir }, conn);
  //     });
  //     it("should close remote transport", () => {
  //       expect(conn.dispatch).toHaveBeenCalledWith(
  //         {
  //           type: "r:transportClose",
  //           data: {
  //             id: "transport1",
  //           },
  //         },
  //         undefined
  //       );
  //     });
  //     it("should fire `failed` event immediately", () => {
  //       expect(onFailed).toHaveBeenCalled();
  //     });
  //   });
  });
  describe("connecting", () => {
    let cb: MockedFunction<() => void>;
    let eb: MockedFunction<(e: unknown) => void>;
    beforeEach(() => {
      msTransport.appData.routerId = "router1";
      msDevice.createSendTransport.mockReturnValueOnce(msTransport);
      connector.start();
      receiveTransportCreated({
        dir: RtcTransportDirection.Send,
        id: "transport1",
        routerId: "router1",
      }, conn);
    });
    describe("successfully", () => {
      beforeEach(() => {
        cb = vi.fn();
        eb = vi.fn();
        conn.dispatch.mockImplementationOnce((_, ack) => {
          ack && ack(null);
        });
        msTransport.emit("connect", {
          dtlsParameters: {
            role: "auto",
            fingerprints: [
              {
                algorithm: "sha-1",
                value: "1:b:3:e",
              },
            ],
          }
        }, cb);
      })
      it("should connect endpoint transport to the router", () => {
        expect(conn.dispatch).toHaveBeenCalledWith({
          type: "r:transportConnect",
          data: {
            id: "transport1",
            dtlsParameters: {
              role: "auto",
              fingerprints: [
                {
                  algorithm: "sha-1",
                  value: "1:b:3:e",
                },
              ],
            },
            routerId: "router1",
          }
        }, expect.any(Function));
      });
      it("should proceed with the connection", () => {
        expect(cb).toHaveBeenCalled();
      });
    });
    describe("error", () => {
      let error: Error;
      beforeEach(() => {
        error = new Error("Unsupported algo");
        conn.dispatch.mockImplementation(({ type }, ack) => {
          if (type === "r:transportConnect") {
            ack && ack(error);
          } else {
            ack && ack(null);
          }
        });
        cb = vi.fn();
        eb = vi.fn();
        msTransport.emit("connect", {
          dtlsParameters: {
            role: "auto",
            fingerprints: [
              {
                algorithm: "sha-1",
                value: "1:b:3:e",
              },
            ],
          }
        }, cb, eb);
      });
      it("should abort the connection", () => {
        expect(cb).not.toHaveBeenCalled();
        expect(eb).toHaveBeenCalledWith(error);
      });
    });
  });
  describe("restarting", () => {
    beforeEach(() => {
      msDevice.createSendTransport.mockReturnValueOnce(msTransport);
      connector.start();
      receiveTransportCreated({
        dir: RtcTransportDirection.Send,
        id: "transport1",
      }, conn);
      msTransport.emit("connectionstatechange", "connected");
    });
    describe("on connection failed", () => {
      describe("successful ICE restart", () => {
        beforeEach(() => {
          conn.dispatch.mockImplementationOnce(({type}, ack) => {
            if (type === "r:iceRestart") {
              ack && ack(null, {
                usernameFragment: "u1",
                password: "p1",
                iceLite: true,
              });
              return;
            }
            ack && ack(null);
          });
          onReady = vi.fn();
          connector.on("ready", onReady);
          msTransport.emit("connectionstatechange", "failed");
        });
        it("should restart ICE on router transport", () => {
          expect(conn.dispatch).toHaveBeenCalledWith({
            type: "r:iceRestart",
            data: {
              transportId: "transport1",
            }
          }, expect.any(Function))
        });
        it("should restart ICE on endpoint transport object", () => {
          expect(msTransport.restartIce).toHaveBeenCalledWith({
            iceParameters: {
            usernameFragment: "u1",
            password: "p1",
            iceLite: true,}
          });
        });
        it("should emit event", () => {
          expect(onReady).toHaveBeenCalled();
        })
      })
      // TODO remote ICE restart failed
    });
    describe("on disconnected", () => {
      beforeEach(() => {
        msTransport.emit("connectionstatechange", "disconnected");
      });
      it("should not restart ICE immediately", () => {
        expect(conn.dispatch).not.toHaveBeenCalledWith(
          {
            type: "r:iceRestart",
            data: {
              transportId: "transport1",
            },
          },
          expect.any(Function)
        );
      });
      it("should not recreate transport", () => {
        expect(conn.dispatch).not.toHaveBeenCalledWith(
          {
            type: "r:transportCreate",
            data: {
              dir: "send",
            },
          },
          expect.any(Function)
        );
      });
      describe("when connection recovers", () => {
        beforeEach(() => {
          msTransport.emit("connectionstatechange", "connected");
          clock.tick(3000);
        });
        it("should cancel restart", () => {
          expect(conn.dispatch).not.toHaveBeenCalledWith(
            {
              type: "r:iceRestart",
              data: {
                transportId: "transport1",
              },
            },
            expect.any(Function)
          );
          expect(msTransport.restartIce).not.toHaveBeenCalled();
        });
      });
      describe("when connection doesn't recover", () => {
        beforeEach(() => {
          conn.dispatch.mockReset().mockImplementationOnce(({type}, ack) => {
            if (type === "r:iceRestart") {
              ack && ack(null, {
                usernameFragment: "alice",
                password: "0aeb",
                iceLite: true,
              });
              return;
            }
            ack && ack(null);
          })
          clock.tick(3100);
        });
        it("should restart ICE", () => {
          expect(conn.dispatch).toHaveBeenCalledWith(
            {
              type: "r:iceRestart",
              data: expect.anything(),
            },
            expect.any(Function)
          );
          // TODO check, unskip, it's flaky
          expect(msTransport.restartIce).toHaveBeenCalledWith({
            iceParameters: {
              usernameFragment: "alice",
              password: "0aeb",
              iceLite: true,
            },
          });
        });
      });
    });
  });
  describe("close", () => {
    beforeEach(() => {
      msDevice.createSendTransport.mockReturnValueOnce(msTransport);
      connector.start();
      receiveTransportCreated({ dir: RtcTransportDirection.Send, id: "transport1" }, conn);
      connector.close();
    });
    it("should close underlying local transport", () => {
      expect(msTransport.close).toHaveBeenCalled();
    });
    it("should close remote transport", () => {
      expect(conn.dispatch).toHaveBeenCalledWith(
        {
          type: "r:transportClose",
          data: {
            id: "transport1",
          },
        },
      );
    });
    describe("starting over", () => {
      let p: Promise<MsTransport>;
      beforeEach(() => {
        conn.dispatch.mockClear();
        msDevice.createSendTransport.mockClear();
        p = connector.getObject();
      });
      it("should have no effect", async () => {
        expect(conn.dispatch).not.toHaveBeenCalledWith(
          expect.objectContaining({
            type: "r:transportCreate",
            data: expect.anything(),
          }),
          expect.any(Function)
        );
        expect(msDevice.createSendTransport).not.toHaveBeenCalled();
        await expect(p).rejects.toThrow("Transport is closed");
      });
    });
    describe("router-side creation", () => {
      beforeEach(() => {
        msDevice.createSendTransport.mockClear();
        onCreated.mockClear();
        onReady.mockClear();
        receiveTransportCreated({ dir: RtcTransportDirection.Send, id: "transport1" }, conn);
      });
      it("should be ignored", async () => {
        expect(msDevice.createSendTransport).not.toHaveBeenCalled();
        expect(onCreated).not.toHaveBeenCalled();
        expect(onReady).not.toHaveBeenCalled();
        const p = connector.getObject();
        await expect(p).rejects.toThrow("Transport is closed");
      });
    });
  });
});
