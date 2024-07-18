import { MockedFunction, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Device, types as ms } from "mediasoup-client";
import FakeTimers from "@sinonjs/fake-timers";
import { getLabelMediaKind } from "../internal/utils.js";

import { RtcClient } from "../RtcClient.js";
import type { SignalConnection } from "../signaling/types.js";
import type { MessageDto } from "../msg/types.js";
import {
  EndpointCaps,
  RtcClientEvents,
  RtcMediaLabel,
  type RtcOutgoingStreamT,
  RtcTransportDirection
} from "../types.js";
import {
  MP_ALL,
  MP_NONE,
  ENDPOINT_RTP_CAPS,
  ENDPOINT_SCTP_CAPS,
  ROUTER_RTP_CAPS,
  createMockConnection,
  createMockConsumer,
  createMockMediaStreamTrack,
  createMockMsDevice,
  createMockProducer,
  createMockTransport,
  receiveServerMessage as disp,
  receiveConsumerCreated,
  receivePermissions,
  receiveRouterCaps,
  receiveTransportCreated,
  MockedMediaStreamTrack,
  MockedMsProducer,
  type MockedSignalConnection,
  type MockedMsDevice,
  type MockedMsTransport,
  type MockedMsConsumer,
} from "../testUtils.js";

import { LogTracer } from "../trace/LogTracer.js";
import * as trace from "../trace/index.js";

trace.setTracer(new LogTracer());

vi.mock("mediasoup-client", () => ({
  Device: vi.fn(),
}));

describe("RtcClient", () => {
  let conn: MockedSignalConnection;
  let rtcClient: RtcClient;
  let mockDevice: MockedMsDevice;
  let mockTransport: MockedMsTransport;
  let clock: FakeTimers.InstalledClock;
  beforeEach(() => {
    conn = createMockConnection();
    mockDevice = createMockMsDevice();
    // @ts-ignore
    Device.mockReturnValue(mockDevice);
    rtcClient = new RtcClient(conn as unknown as SignalConnection);
    clock = FakeTimers.install();
    vi.spyOn(trace, "reportError").mockClear();
  });
  afterEach(() => {
    clock.uninstall();
  })
  it("should subscribe to incoming messages", () => {
    expect(conn.subscribe).toHaveBeenCalledWith(expect.any(Function));
  });
  describe("initialization", () => {
    let onReady: MockedFunction<() => void>;
    let onEndpointCaps: MockedFunction<(p: EndpointCaps) => void>;
    let onConsumingReady: MockedFunction<() => void>;
    let onProducingReady: MockedFunction<() => void>;
    describe("when router caps arrive", () => {
      beforeEach(() => {
        onEndpointCaps = vi.fn();
        rtcClient.on(RtcClientEvents.EndpointCaps, onEndpointCaps);
        receiveRouterCaps(conn);
      });
      it("should init ms device", () => {
        expect(Device).toHaveBeenCalled();
        expect(mockDevice.load).toHaveBeenCalledWith({
          routerRtpCapabilities: ROUTER_RTP_CAPS,
        });
      });
      it("should send endpoint capabilities", () => {
        expect(conn.dispatch).toHaveBeenCalledWith(
          {
            type: "r:endpointCaps",
            // @see mockDevice initialization
            data: {
              rtpCapabilities: ENDPOINT_RTP_CAPS,
              sctpCapabilities: ENDPOINT_SCTP_CAPS,
            },
          },
        );
      });
      it("should emit endpoint caps event", () => {
        expect(onEndpointCaps).toHaveBeenCalledWith({
          rtpCapabilities: ENDPOINT_RTP_CAPS,
          sctpCapabilities: ENDPOINT_SCTP_CAPS,
        });
      });
      it("should start initializing recv transport", () => {
        expect(conn.dispatch).toHaveBeenCalledWith(
          {
            type: "r:transportCreate",
            data: expect.objectContaining({
              dir: "recv",
            }),
          },
          expect.any(Function),
        );
      });
      it("should send SCTP caps with transport create msg", () => {
        expect(conn.dispatch).toHaveBeenCalledWith(
          {
            type: "r:transportCreate",
            data: expect.objectContaining({
              sctpCapabilities: ENDPOINT_SCTP_CAPS,
            }),
          },
          expect.any(Function),
        );
      });
      it("should not start initializing send transport", () => {
        expect(conn.dispatch).not.toHaveBeenCalledWith(
          {
            type: "r:transportCreate",
            data: expect.objectContaining({
              dir: "send",
            }),
          },
          expect.any(Function),
        );
      });
      describe("when permissions arrive", () => {
        beforeEach(() => {
          receivePermissions(undefined, undefined, conn);
        })
        it("should start initializing send transport", () => {
          expect(conn.dispatch).toHaveBeenCalledWith(
            {
              type: "r:transportCreate",
              data: expect.objectContaining({
                dir: "send",
              }),
            },
            expect.any(Function),
          );
        });
        it("should send SCTP caps with transport create msg", () => {
          expect(conn.dispatch).toHaveBeenCalledWith(
            {
              type: "r:transportCreate",
              data: expect.objectContaining({
                sctpCapabilities: ENDPOINT_SCTP_CAPS,
              }),
            },
            expect.any(Function),
          );
        })
      });
      describe("transports", () => {
        describe.each([
          [RtcTransportDirection.Recv, "transport1"],
          [RtcTransportDirection.Send, "transport2"],
        ])("%s", (dir, id) => {
          beforeEach(() => {
            mockTransport = createMockTransport(
              id,
            ) as MockedMsTransport;
            onConsumingReady = vi.fn();
            onProducingReady = vi.fn();
            rtcClient.on(RtcClientEvents.ConsumingReady, onConsumingReady);
            rtcClient.on(RtcClientEvents.ProducingReady, onProducingReady);
            const method = dir === "recv" ? "createRecvTransport" : "createSendTransport";
            mockDevice[method].mockReturnValue(mockTransport);
            receivePermissions(undefined, undefined, conn);
            receiveTransportCreated({ dir, id }, conn);
          });
          it("should create local transport object", () => {
            const method = dir === "recv" ? "createRecvTransport" : "createSendTransport";
            expect(mockDevice[method]).toHaveBeenCalledWith(expect.objectContaining({
              id,
              dtlsParameters: {
                role: "auto",
                fingerprints: [
                  {
                    algorithm: "sha-1",
                    value: "1:b:3:e",
                  },
                ],
              },
              iceCandidates: [
                {
                  foundation: "s1",
                  priority: 1,
                  protocol: "udp",
                  ip: "1.2.10.100",
                  port: 32110,
                  type: "host",
                },
              ],
              iceParameters: {
                usernameFragment: "user",
                password: "12kfo4$,2",
                iceLite: true,
              },
              sctpParameters: {
                port: 11121,
                OS: 1000,
                MIS: 1000,
                maxMessageSize: 65535,
              },
            }));
          });
          it("should emit readiness event", () => {
            const handler = dir === "recv" ? onConsumingReady : onProducingReady;
            expect(handler).toHaveBeenCalled();
          });
          describe("connecting", () => {
            let callback: Function;
            let errback: Function;
            let runRequest: Function;
            beforeEach(() => {
              callback = vi.fn();
              errback = vi.fn();
              runRequest = () =>
                // @ts-ignore
                mockTransport.emit(
                  "connect",
                  {
                    dtlsParameters: {
                      role: "auto",
                      fingerprints: [{ algorithm: "sha-1", value: "1" }],
                    },
                  },
                  callback,
                  errback,
                );
            });
            it("should dispatch connection message to the server", () => {
              runRequest();
              expect(conn.dispatch).toHaveBeenCalledWith(
                {
                  type: "r:transportConnect",
                  data: {
                    id,
                    dtlsParameters: {
                      role: "auto",
                      fingerprints: [
                        {
                          algorithm: "sha-1",
                          value: "1",
                        },
                      ],
                    },
                  },
                },
                expect.any(Function),
              );
            });
            describe("normally", () => {
              beforeEach(() => {
                conn.dispatch.mockImplementation((_, cb) => cb && cb(null, {}));
                runRequest();
              });
              it("should call back", () => {
                expect(callback).toHaveBeenCalled();
              });
            });
            describe("in case of error", () => {
              beforeEach(() => {
                conn.dispatch.mockImplementation((_, cb) => cb && cb(new Error("Snag!")));
                runRequest();
              });
              it("should errback", () => {
                expect(errback).toHaveBeenCalled();
              });
            });
          });
        });
        describe.skip("connectionstatechange", () => {
          // TOOD
        });
      });
    });
    describe("when permissions arrive", () => {
      let onPermsChange: MockedFunction<() => void>;
      beforeEach(() => {
        onPermsChange = vi.fn();
        rtcClient.on(RtcClientEvents.PermissionsChange, onPermsChange)
        receivePermissions(undefined, undefined, conn);
      });
      it("should emit event", () => {
        expect(onPermsChange).toHaveBeenCalled();
      })
      it("shouldn't init send transport until router caps received", () => {
        expect(conn.dispatch).not.toHaveBeenCalledWith(
          {
            type: "r:transportCreate",
            data: expect.objectContaining({
              dir: "send",
            }),
          },
          expect.any(Function),
        );
      });
      describe("after router caps have arrived", () => {
        beforeEach(() => {
          receiveRouterCaps(conn);
        });
        it("should initialize send transport", () => {
          expect(conn.dispatch).toHaveBeenCalledWith(
            {
              type: "r:transportCreate",
              data: expect.objectContaining({
                dir: "send",
              }),
            },
            expect.any(Function),
          );
        })
      })
    });
    describe("when there are no media permissions", () => {
      beforeEach(() => {
        receiveRouterCaps(conn);
        receivePermissions(MP_NONE, MP_ALL, conn);
      })
      it("shouldn't initialize send transport", () => {
        expect(conn.dispatch).not.toHaveBeenCalledWith(
          {
            type: "r:transportCreate",
            data: expect.objectContaining({
              dir: "send",
            }),
          },
          undefined,
        );
      })
      describe("after finishing creating recv transport", () => {
        beforeEach(() => {
          onReady = vi.fn();
          rtcClient.on(RtcClientEvents.Ready, onReady);
          mockDevice.createRecvTransport.mockReturnValue(createMockTransport(
            "transport1",
          ) as MockedMsTransport);
          receiveTransportCreated({ dir: RtcTransportDirection.Recv, id: "transport1" }, conn);
        })
        it("should emit readiness event", () => {
          expect(onReady).toHaveBeenCalled();
        })
      });
    });
    describe("when both transports are initialized", () => {
      beforeEach(async () => {
        onReady = vi.fn();
        rtcClient.on(RtcClientEvents.Ready, onReady);
        mockDevice.createRecvTransport.mockReturnValue(createMockTransport(
          "transport1",
        ) as MockedMsTransport);
        receiveRouterCaps(conn);
        await clock.tickAsync(0);
        receivePermissions(undefined, undefined, conn);
        await clock.tickAsync(0);
        receiveTransportCreated({ dir: RtcTransportDirection.Recv, id: "transport1" }, conn);
        await clock.tickAsync(0);
        mockDevice.createSendTransport.mockReturnValue(createMockTransport(
          "transport2",
        ) as MockedMsTransport);
        receiveTransportCreated({ dir: RtcTransportDirection.Send, id: "transport2" }, conn);
        await clock.tickAsync(0);
      });
      it("should emit readiness event", () => {
        expect(onReady).toHaveBeenCalled();
      });
    });
  });
  describe("outgoing media streams", () => {
    let track: MockedMediaStreamTrack;
    let mockProducer: MockedMsProducer;
    const label = RtcMediaLabel.Camera;
    describe("sendStream", () => {
      beforeEach(() => {
        mockTransport = createMockTransport(
          "transport2",
        ) as MockedMsTransport;
        mockProducer = createMockProducer("producer1", "video", {
          label: "video",
        }) as MockedMsProducer;
        mockTransport.produce.mockResolvedValueOnce(mockProducer as ms.Producer);
        mockDevice.createSendTransport.mockReturnValue(mockTransport);
        track = createMockMediaStreamTrack("video");
      });
      // TODO when producing transport isn't ready
      describe("when the endpoint is incapable of producing a stream of the given kind", () => {
        beforeEach(async () => {
          mockDevice.canProduce.mockReturnValue(false);
          receiveRouterCaps(conn);
          await clock.tickAsync(0);
          receivePermissions(undefined, undefined, conn);
          await clock.tickAsync(0);
          receiveTransportCreated({ dir: RtcTransportDirection.Send, id: "transport2" }, conn);
        });
        it("should throw", async () => {
          await expect(
            rtcClient.sendStream(label, track as unknown as MediaStreamTrack),
          ).rejects.toThrow(/Unable to stream video/);
        });
      });
      describe("when the endpoint is capable", () => {
        let stream: RtcOutgoingStreamT;
        let sp: Promise<RtcOutgoingStreamT>;
        beforeEach(async () => {
          conn.dispatch.mockImplementation((_, ack) => ack && ack());
          mockDevice.canProduce.mockReturnValue(true);
          receiveRouterCaps(conn);
          await clock.tickAsync(0);
          receivePermissions(undefined, undefined, conn);
        });
        describe("when transport isn't ready", () => {
          it("should throw error", async () => {
            await expect(rtcClient.sendStream(label, track as unknown as MediaStreamTrack)).rejects.toThrow(/Not ready for streaming/);
          });
        });
        describe("when transport is ready", () => {
          beforeEach(async () => {
            receiveTransportCreated({ dir: RtcTransportDirection.Send, id: "transport2" }, conn);
            await clock.tickAsync(0);
            sp = rtcClient.sendStream(label, track as unknown as MediaStreamTrack);
            sp.catch(() => { });
            await clock.tickAsync(0);
          });
          it("should init producer", () => {
            expect(mockTransport.produce).toHaveBeenCalledWith(
              expect.objectContaining({
                track: expect.objectContaining({
                  kind: "video",
                }),
                appData: {
                  label: "video",
                },
              }),
            );
          });
          describe("stream control object", () => {
            beforeEach(async () => {
              stream = await sp;
            })
            it("should expose stream attributes", () => {
              expect(stream.paused).toBe(false);
              expect(stream.label).toEqual("video");
            });
            it("should be properly connected", () => {
              stream.pause();
              expect(conn.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                  type: "r:toggleProducer",
                  data: expect.objectContaining({
                    id: "producer1",
                    paused: true,
                  }),
                }),
                expect.any(Function),
              );
              expect(mockProducer.pause).toHaveBeenCalled();
            });
          });
        });
      });
    });
  });
  describe("consumers", () => {
    const label = RtcMediaLabel.Camera;
    let mockConsumer: MockedMsConsumer;
    let onPeerStreamAvail: MockedFunction<() => void>;
    let onPeerStreamUnavail: MockedFunction<() => void>;
    beforeEach(async () => {
      onPeerStreamAvail = vi.fn();
      onPeerStreamUnavail = vi.fn();
      rtcClient.on(RtcClientEvents.PeerStreamAvailable, onPeerStreamAvail);
      rtcClient.on(RtcClientEvents.PeerStreamUnavailable, onPeerStreamUnavail);
      mockTransport = createMockTransport(
        "transport1",
      ) as MockedMsTransport;
      mockDevice.createRecvTransport.mockReturnValueOnce(mockTransport);
      mockConsumer = createMockConsumer(label, "peer1", "consumer1");
      mockTransport.consume.mockResolvedValueOnce(mockConsumer);
      receiveRouterCaps(conn);
      await clock.tickAsync(0);
      receiveTransportCreated({ dir: RtcTransportDirection.Recv, id: "transport1" }, conn);
      await clock.tickAsync(0);
      conn.dispatch.mockImplementation(({ type }, ack) => {
        if (!ack) {
          return;
        }
        if (type === "r:toggleConsumer") {
          setTimeout(ack, 150);
        } else {
          ack();
        }
      });
    });
    describe("basically", () => {
      beforeEach(async () => {
        receiveConsumerCreated({
          id: "consumer1",
          kind: getLabelMediaKind(label),
          producerId: "producer1",
          paused: true,
          rtpParameters: {
            codecs: [],
            headerExtensions: [],
          },
          appData: {
            label,
            peerId: "peer1",
            producerPaused: false,
          },
        }, conn);
      });
      it("should create local consumer", () => {
        expect(mockTransport.consume).toHaveBeenCalledWith(
          expect.objectContaining({
            id: mockConsumer.id,
            kind: getLabelMediaKind(label),
            producerId: "producer1",
            rtpParameters: {
              codecs: [],
              headerExtensions: [],
            },
            appData: {
              label,
              peerId: "peer1",
              producerPaused: false,
            },
          }),
        );
      });
      it("should dispatch resume consumer message", () => {
        expect(conn.dispatch).toHaveBeenCalledWith(
          {
            type: "r:toggleConsumer",
            data: {
              id: "consumer1",
              paused: false,
            },
          },
          expect.any(Function),
        );
      });
      it("should emit initial peerstreamavailable event", () => {
        expect(onPeerStreamAvail).toHaveBeenCalledWith({
          label,
          resumed: false,
          peerId: "peer1",
          track: expect.anything(),
        });
      });
      describe("after getting ack", () => {
        beforeEach(() => {
          clock.tick(150);
        });
        it("should not resume the local consumer", () => {
          expect(mockConsumer.resume).not.toHaveBeenCalled();
        });
        it("should emit final peerstreamavailble event", () => {
          expect(onPeerStreamAvail).toHaveBeenCalledWith({
            label,
            resumed: true,
            peerId: "peer1",
            track: expect.anything(),
          });
        });
      });
      describe("consumer close", () => {
        describe("basically", () => {
          beforeEach(() => {
            mockConsumer.closed = true;
            mockConsumer.emit("trackended");
          });
          it("should remove consumer", () => {
            expect(rtcClient.getPeerMediaTrack(label, "peer1")).toBeUndefined();
          });
          it("should emit event", () => {
            expect(onPeerStreamUnavail).toHaveBeenCalledWith({
              label,
              paused: false,
              peerId: "peer1",
            });
          });
        });
        describe("when the event handler crashes", () => {
          beforeEach(() => {
            mockConsumer.closed = true;
            onPeerStreamUnavail.mockImplementationOnce(() => {
              throw new Error("Snag!");
            });
            mockConsumer.emit("trackended");
          });
          it("should catch the error", () => {
            expect(trace.reportError).toHaveBeenCalledWith(expect.objectContaining({
              message: "Event handler crashed: Error: Snag!",
              data: expect.objectContaining({
                eventName: "peerstreamunavailable",
                label,
              })
            }));
          });
        });
      });
      describe("consumer pause", () => {
        beforeEach(() => {
          clock.tick(150);
          onPeerStreamUnavail.mockClear();
          disp({
            type: "r:i:consumerState",
            data: {
              id: "consumer1",
              paused: true,
              producerPaused: true,
            },
          } as MessageDto, conn);
        });
        it("should pause the local consumer", () => {
          expect(mockConsumer.pause).toHaveBeenCalled();
        });
        it("should emit event", () => {
          expect(onPeerStreamUnavail).toHaveBeenCalledWith({
            label,
            paused: true,
            peerId: "peer1",
          });
        });
        it("should update producerPaused state", () => {
          expect(mockConsumer.appData.producerPaused).toEqual(true);
        });
      });
      describe("consumer resume", () => {
        beforeEach(() => {
          clock.tick(150);

          onPeerStreamAvail.mockClear();
          mockConsumer.resume.mockClear();
          mockConsumer.paused = true;
          mockConsumer.appData.producerPaused = true;
          disp({
            type: "r:i:consumerState",
            data: {
              id: "consumer1",
              paused: false,
              producerPaused: false,
            },
          } as MessageDto, conn);
        });
        it("should resume local consumer", () => {
          expect(mockConsumer.resume).toHaveBeenCalled();
        });
        it("should emit event", () => {
          expect(onPeerStreamAvail).toHaveBeenCalledWith({
            label,
            peerId: "peer1",
            resumed: true,
            track: expect.anything(),
          });
        });
        it("shoud update producer paused state", () => {
          expect(mockConsumer.appData.producerPaused).toEqual(false);
        });
      });
      describe("on transport close", () => {
        beforeEach(() => {
          clock.tick(150);

          onPeerStreamUnavail.mockClear();
          mockConsumer.closed = true;
          mockConsumer.emit("transportclose");
        });
        it("should remove itself", () => {
          expect(rtcClient.getPeerMediaTrack(label, "peer1")).toBeUndefined();
        });
        it("should emit event", () => {
          expect(onPeerStreamUnavail).toHaveBeenCalledWith({
            label,
            peerId: "peer1",
            paused: false,
          });
        });
      });
      describe("on remote consumer close", () => {
        beforeEach(() => {
          clock.tick(150);

          onPeerStreamUnavail.mockClear();
          mockConsumer.closed = true;
          disp({
            type: "r:i:consumerClosed",
            data: {
              id: mockConsumer.id,
            },
          } as MessageDto, conn);
        });
        it("should remove itself", () => {
          expect(rtcClient.getPeerMediaTrack(label, "peer1")).toBeUndefined();
        });
        it("should emit event", () => {
          expect(onPeerStreamUnavail).toHaveBeenCalledWith({
            label,
            peerId: "peer1",
            paused: false,
          });
        });
      });
    });
    describe("when peerstreamavailable handler crashes", () => {
      beforeEach(async () => {
        onPeerStreamAvail.mockImplementationOnce(() => {
          throw new Error("Snag!");
        });
        receiveConsumerCreated({
          id: "consumer1",
          kind: getLabelMediaKind(label),
          producerId: "producer1",
          paused: true,
          rtpParameters: {
            codecs: [],
            headerExtensions: [],
          },
          appData: {
            label,
            peerId: "peer1",
            producerPaused: false,
          },
        }, conn);
        await clock.tickAsync(0);
      });
      it("should catch the error", () => {
        expect(trace.reportError).toHaveBeenCalledWith(expect.objectContaining({
          message: "Event handler crashed: Error: Snag!",
          data: expect.objectContaining({
            eventName: "peerstreamavailable",
            label,
          })
        }));
      });
    });
    describe("when consumer with paused producer is created", () => {
      beforeEach(async () => {
        receiveConsumerCreated({
          id: "consumer1",
          kind: getLabelMediaKind(label),
          producerId: "producer1",
          paused: true,
          rtpParameters: {
            codecs: [],
            headerExtensions: [],
          },
          appData: {
            label,
            peerId: "peer1",
            producerPaused: true,
          },
        }, conn);
        await clock.tickAsync(0);
      });
      it("should pause the endpoint consumer", () => {
        expect(mockConsumer.pause).toHaveBeenCalled();
      });
      it("should not emit any event", () => {
        expect(onPeerStreamUnavail).not.toHaveBeenCalled();
        expect(onPeerStreamAvail).not.toHaveBeenCalled();
      });
    });
  });
  describe("failure", () => {
    let onFailure: MockedFunction<(e: Error) => void>;
    beforeEach(() => {
      onFailure = vi.fn();
      rtcClient.on(RtcClientEvents.Failure, onFailure);
    });
    function setupSendTransportFailure() {
      mockDevice.createSendTransport.mockImplementationOnce(() => {
        throw new Error("Snag!");
      });
    }
    async function runTransport(dir: RtcTransportDirection) {
      receiveTransportCreated({ dir, id: "transport1" }, conn);
      await clock.tickAsync(0);
    }
    function runSendTransport() {
      return runTransport(RtcTransportDirection.Send);
    }
    function runRecvTransport() {
      return runTransport(RtcTransportDirection.Recv);
    }
    function setupRecvTransportFailure() {
      mockDevice.createRecvTransport.mockImplementationOnce(() => {
        throw new Error("Snag!");
      });
    }
    function setupDeviceInitFailure() {
      mockDevice.load.mockRejectedValueOnce(new Error("Snag!"));
    }
    describe.each([
      ["device init", setupDeviceInitFailure, () => {}, "Device init failed: Error: Snag!"],
      // TODO use comprehensible error message
      ["send transport", setupSendTransportFailure, runSendTransport, "Restart failed"],
      ["recv transport", setupRecvTransportFailure, runRecvTransport, "Restart failed"],
    ])("%s", (_, setup, run, err) => {
      beforeEach(async () => {
        setup();
        receiveRouterCaps(conn);
        await clock.tickAsync(0);
        receivePermissions(undefined, undefined, conn);
        await clock.tickAsync(0);
        await run();
      });
      it("shoud report error", () => {
        expect(trace.reportError).toHaveBeenCalled();
        expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({
          message: err,
        }));
      });
    });
  });
});
