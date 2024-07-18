import { Mock, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FakeTimers from "@sinonjs/fake-timers";

import AudioController from "../AudioController.js";
import * as VolumeMeter from "../VolumeMeter.js";
import {
  type MockedAudioContext,
  type MockedGainNode,
  type MockedMediaStreamAudioSourceNode,
  type MockedAudioDestinationNode,
  createMockAudioContext
} from "../testUtils.js";
import {
  type MockedMediaStream,
  type MockedMediaStreamTrack,
   createMockMediaStream,
   createMockMediaStreamTrack
} from "../../testUtils.js";

describe("AudioController", () => {
  let audio: AudioController;
  let audioElem: HTMLMediaElement;
  let clock: FakeTimers.InstalledClock;
  let handleStateChange: () => void;
  let outputStreamAudioTrack: MockedMediaStreamTrack;
  let rtcPeerConnectionOne: MockedRTCPeerConnection;
  let rtcPeerConnectionTwo: MockedRTCPeerConnection;
  let acOutputStream: MockedMediaStream;
  let audioContext: MockedAudioContext;
  let sdpOfferMock: MockedRTCSessionDescription;
  let sdpAnswerMock: MockedRTCSessionDescription;
  let loopbackStream: MockedMediaStream;
  let loopbackTrack: MockedMediaStreamTrack;
  let acDestinationNode: MockedAudioDestinationNode;
  let peerAudioTrack: MockedMediaStreamTrack;
  let peerAudioTrackClone: MockedMediaStreamTrack;
  let peerInputStream: MockedMediaStream;
  let acBaseGainNode: MockedGainNode;
  let acGainNode: MockedGainNode;
  let acGainNode2: MockedGainNode;
  let acGainNode3: MockedGainNode;
  let acSourceNode: MockedMediaStreamAudioSourceNode;
  let acSourceNode2: MockedMediaStreamAudioSourceNode;
  let acSourceNode3: MockedMediaStreamAudioSourceNode;
  let setup: () => void;
  let run: () => void;

  beforeEach(() => {
    clock = FakeTimers.install();
    // @ts-expect-error fixit
    vi.spyOn(VolumeMeter, "VolumeMeter").mockImplementation(() => ({
      start: vi.fn(),
      close: vi.fn(),
    }));
    audioElem = {
      pause: vi.fn().mockImplementationOnce(() => Promise.resolve()),
      paused: true,
      play: vi.fn().mockImplementationOnce(() => Promise.resolve()),
      srcObject: null,
      volume: 1,
    } as unknown as HTMLMediaElement;
    handleStateChange = vi.fn();
    outputStreamAudioTrack = createMockMediaStreamTrack("audio", "track10");
    acOutputStream = createMockMediaStream();
    acOutputStream.getTracks.mockReturnValue([outputStreamAudioTrack]);
    acDestinationNode = {
      stream: acOutputStream,
      disconnect: vi.fn(),
    };
    audioContext = createMockAudioContext();
    audioContext.createMediaStreamDestination.mockReturnValueOnce(
      acDestinationNode
    );
    sdpOfferMock = createMockSdp();
    sdpAnswerMock = createMockSdp();
    rtcPeerConnectionOne = createRtcPeerConnection(sdpOfferMock as RTCSessionDescription);
    rtcPeerConnectionTwo = createRtcPeerConnection(undefined, sdpAnswerMock as RTCSessionDescription);

    global.AudioContext = vi.fn().mockReturnValue(audioContext);
    loopbackStream = createMockMediaStream("audio");
    loopbackTrack = createMockMediaStreamTrack("audio");
    global.MediaStream = vi.fn().mockReturnValueOnce(loopbackStream);
    // @ts-expect-error typescript-migration
    global.RTCPeerConnection = vi
      .fn()
      .mockReturnValueOnce(rtcPeerConnectionOne)
      .mockReturnValueOnce(rtcPeerConnectionTwo);
    global.RTCIceCandidate = vi.fn();
    setup = () => {
      peerAudioTrack = createMockMediaStreamTrack("audio", "track01");
      peerAudioTrackClone = createMockMediaStreamTrack("audio", "track02");
      peerAudioTrack.clone.mockReturnValue(peerAudioTrackClone);
      peerInputStream = createMockMediaStream();

      // @ts-expect-error typescript-migration
      global.MediaStream.mockClear().mockReturnValueOnce(peerInputStream);
      // @ts-expect-error typescript-migration
      global.MediaStream.mockClear().mockReturnValueOnce(peerInputStream);
      // @ts-expect-error typescript-migration
      global.MediaStream.mockClear().mockReturnValueOnce(peerInputStream);

      acBaseGainNode = createAcGainNode();
      acGainNode = createAcGainNode();
      acGainNode2 = createAcGainNode();
      acGainNode3 = createAcGainNode();
      const mediaStream = createMockMediaStream();
      acSourceNode = createAcSourceNode(mediaStream);
      acSourceNode2 = createAcSourceNode(mediaStream);
      acSourceNode3 = createAcSourceNode(mediaStream);

      audioContext.createGain.mockReturnValueOnce(acBaseGainNode);
      audioContext.createGain.mockReturnValueOnce(acGainNode);
      audioContext.createGain.mockReturnValueOnce(acGainNode2);
      audioContext.createGain.mockReturnValueOnce(acGainNode3);
      audioContext.createMediaStreamSource.mockReturnValueOnce(acSourceNode);
      audioContext.createMediaStreamSource.mockReturnValueOnce(acSourceNode2);
      audioContext.createMediaStreamSource.mockReturnValueOnce(acSourceNode3);
    };
    setup();
    run = async () => {
      audio = new AudioController();
      await audio.attachOutput(audioElem);
      await audio.initialize();
      audio.plug("peer01", peerAudioTrack as unknown as MediaStreamTrack);
      audio.plug("peer02", peerAudioTrack as unknown as MediaStreamTrack);
      audio.plug("peer03", peerAudioTrack as unknown as MediaStreamTrack);
    };
  });
  afterEach(() => {
    clock.uninstall();
  });
  describe("initialize", () => {
    describe("detached", () => {
      beforeEach(() => {
        audio = new AudioController();
        audio.initialize();
      });
      it("should create context", () => {
        expect(global.AudioContext).toHaveBeenCalled();
        expect(audioContext.createMediaStreamDestination).toHaveBeenCalled();
      });
      it("should not bind context output", () => {
        expect(global.MediaStream).not.toHaveBeenCalled();
        expect(global.RTCPeerConnection).not.toHaveBeenCalled();
        expect(global.RTCIceCandidate).not.toHaveBeenCalled();
      });
    });
    describe("repeated initialization", () => {
      beforeEach(async () => {
        audio = new AudioController();
        await audio.initialize();
        // @ts-expect-error typescript-migration
        global.AudioContext.mockClear();
        // @ts-expect-error typescript-migration
        global.MediaStream.mockClear();
        // @ts-expect-error typescript-migration
        global.RTCPeerConnection.mockClear();
        // @ts-expect-error typescript-migration
        global.RTCIceCandidate.mockClear();
        await audio.initialize();
      });
      it("should skip", () => {
        expect(global.AudioContext).not.toHaveBeenCalled();
        expect(global.MediaStream).not.toHaveBeenCalled();
        expect(global.RTCPeerConnection).not.toHaveBeenCalled();
        expect(global.RTCIceCandidate).not.toHaveBeenCalled();
      });
    });
    describe("initializing output stream", () => {
      describe("loopback stream", () => {
        describe("basically", () => {
          beforeEach(async () => {
            audio = new AudioController({
              echoCancellationLoopback: true,
            });
            await audio.initialize();
            await audio.attachOutput(audioElem);
            triggerRtcPeerConnectionEvent(rtcPeerConnectionTwo, "track", {
              track: loopbackTrack,
            });
          });
          it("should be used", async () => {
            expect(global.MediaStream).toHaveBeenCalled();
            expectLoopbackConnectionCreated(
              rtcPeerConnectionOne,
              rtcPeerConnectionTwo,
              sdpOfferMock,
              sdpAnswerMock,
              outputStreamAudioTrack
            );
            expect(audioElem.srcObject).toEqual(loopbackStream);
            expect(loopbackStream.addTrack).toHaveBeenCalledWith(loopbackTrack);
          });
        });
        describe("no echo cancellation loopback", () => {
          beforeEach(async () => {
            audio = new AudioController({
              echoCancellationLoopback: false,
            });
            await audio.initialize();
            await audio.attachOutput(audioElem);
            triggerRtcPeerConnectionEvent(rtcPeerConnectionTwo, "track", {
              track: loopbackTrack,
            });
          });
          it("should not be used", () => {
            expect(global.RTCPeerConnection).not.toHaveBeenCalled();
            expect(audioElem.srcObject).toEqual(acOutputStream);
          });
        });
        describe("on network failure", () => {
          beforeEach(async () => {
            audio = new AudioController();
            await audio.initialize();
            await audio.attachOutput(audioElem);
            triggerRtcPeerConnectionEvent(rtcPeerConnectionTwo, "track", {
              track: loopbackTrack,
            });
            loopbackStream.getTracks.mockReturnValue([loopbackTrack]);
          });
          describe.each([["local end"], ["remote end"]])("%s", (caption) => {
            let rtcPeerConnection: MockedRTCPeerConnection;
            let newLocalRtcPeerConnection: MockedRTCPeerConnection;
            let newRemoteRtcPeerConnection: MockedRTCPeerConnection;
            let newLoopbackTrack: MockedMediaStreamTrack;
            beforeEach(() => {
              rtcPeerConnection =
                caption.split(" ")[0] === "local"
                  ? rtcPeerConnectionOne
                  : rtcPeerConnectionTwo;
              newLocalRtcPeerConnection = createRtcPeerConnection(sdpOfferMock as RTCSessionDescription);
              newRemoteRtcPeerConnection = createRtcPeerConnection(
                undefined,
                sdpAnswerMock  as RTCSessionDescription
              );
              newLoopbackTrack = createMockMediaStreamTrack("audio", "track02");
              // @ts-expect-error typescript-migration
              RTCPeerConnection.mockReset()
                .mockReturnValueOnce(newLocalRtcPeerConnection)
                .mockReturnValueOnce(newRemoteRtcPeerConnection);
              rtcPeerConnection.connectionState = "failed";
              triggerRtcPeerConnectionEvent(
                rtcPeerConnection,
                "connectionstatechange"
              );
            });
            it("should close current RTC peer loopback pair", () => {
              expect(rtcPeerConnectionOne.close).toHaveBeenCalled();
              expect(rtcPeerConnectionTwo.close).toHaveBeenCalled();
            });
            it("should remove loopback-processed track from output", () => {
              expect(loopbackStream.removeTrack).toHaveBeenCalledWith(
                loopbackTrack
              );
            });
            describe("recovery loop", () => {
              beforeEach(async () => {
                await clock.tickAsync(1000);
              });
              it("should create new loopback connection", () => {
                expectLoopbackConnectionCreated(
                  newLocalRtcPeerConnection,
                  newRemoteRtcPeerConnection,
                  sdpOfferMock,
                  sdpAnswerMock,
                  outputStreamAudioTrack
                );
              });
              describe("on success", () => {
                beforeEach(() => {
                  loopbackStream.addTrack.mockClear();
                  triggerRtcPeerConnectionEvent(
                    newRemoteRtcPeerConnection,
                    "track",
                    {
                      track: newLoopbackTrack,
                    }
                  );
                });
                it("should attach new processed audio track to output", () => {
                  expect(loopbackStream.addTrack).toHaveBeenCalledWith(
                    newLoopbackTrack
                  );
                });
              });
              describe("on failure", () => {
                let nextLocalRtcPeerConnection: MockedRTCPeerConnection;
                let nextRemoteRtcPeerConnection: MockedRTCPeerConnection;
                beforeEach(async () => {
                  nextLocalRtcPeerConnection =
                    createRtcPeerConnection(sdpOfferMock as RTCSessionDescription);
                  nextRemoteRtcPeerConnection = createRtcPeerConnection(
                    undefined,
                    sdpAnswerMock as RTCSessionDescription
                  );
                  // @ts-expect-error typescript-migration
                  RTCPeerConnection.mockReset()
                    .mockReturnValueOnce(nextLocalRtcPeerConnection)
                    .mockReturnValueOnce(nextRemoteRtcPeerConnection);
                  newLocalRtcPeerConnection.connectionState = "failed";
                  triggerRtcPeerConnectionEvent(
                    newLocalRtcPeerConnection,
                    "connectionstatechange"
                  );
                  await clock.tickAsync(2000);
                });
                it("should keep trying", () => {
                  expect(newLocalRtcPeerConnection.close).toHaveBeenCalled();
                  expect(newRemoteRtcPeerConnection.close).toHaveBeenCalled();
                  expectLoopbackConnectionCreated(
                    nextLocalRtcPeerConnection,
                    nextRemoteRtcPeerConnection,
                    sdpOfferMock,
                    sdpAnswerMock,
                    outputStreamAudioTrack
                  );
                });
              });
            });
          });
        });
      });
    });
  });
  describe("attaching output", () => {
    beforeEach(() => {
      audio = new AudioController();
    });
    describe("before initialization", () => {
      beforeEach(async () => {
        await audio.attachOutput(audioElem);
        await audio.initialize();
      });
      it("should source context output into audio element", () => {
        expect(audioElem.srcObject).toBe(loopbackStream);
      });
      describe("until demanded to start", () => {
        it("should not start playing audio", () => {
          expect(audioContext.resume).not.toHaveBeenCalled();
          expect(audioElem.play).not.toHaveBeenCalled();
        });
      });
      describe("after explicit start command", () => {
        beforeEach(async () => {
          audio.start();
          await clock.tickAsync(0);
        });
        it("should start playing audio", () => {
          expect(audioContext.resume).toHaveBeenCalled();
          expect(audioElem.play).toHaveBeenCalled();
        });
      });
    });
    describe("after initialization", () => {
      beforeEach(async () => {
        await audio.attachOutput(audioElem);
        await audio.initialize();
      });
      it("should source context output into audio element", () => {
        expect(audioElem.srcObject).toEqual(loopbackStream);
      });
      describe("until demanded to start", () => {
        it("should not start playing audio", () => {
          expect(audioContext.resume).not.toHaveBeenCalled();
          expect(audioElem.play).not.toHaveBeenCalled();
        });
      });
      describe("after explicit start command", () => {
        beforeEach(async () => {
          audio.start();
          await clock.tickAsync(0);
        });
        it("should start playing audio", () => {
          expect(audioContext.resume).toHaveBeenCalled();
          expect(audioElem.play).toHaveBeenCalled();
        });
      });
    });
  });
  describe("handleStateChange", () => {
    const states: AudioContextState[] = ["suspended", "running", "closed"];
    beforeEach(async () => {
      audio = new AudioController();
      await audio.attachOutput(audioElem);
      audio.on("statechange", handleStateChange);
      await audio.initialize();
    });
    it("should bind AC onstatechange listener", () => {
      expect(audioContext.onstatechange).toEqual(expect.any(Function));
    });
    describe.each(states)("transitioning to %s state", (state) => {
      beforeEach(() => {
        audioContext.state = state;
        audioContext.resume.mockClear();
        audioContext.onstatechange && audioContext.onstatechange();
      });
      if (["suspended", "interrupted", "running"].includes(state)) {
        it("should not resume AC", () => {
          expect(audioContext.resume).not.toHaveBeenCalled();
        });
        it("should invoke callback", () => {
          expect(handleStateChange).toHaveBeenCalled();
        });
      } else {
        it("should ignore", () => {
          expect(audioContext.resume).not.toHaveBeenCalled();
          expect(handleStateChange).not.toHaveBeenCalled();
        });
      }
    });
  });
  describe("plugging in and off", () => {
    beforeEach(async () => {
      audio = new AudioController();
      await audio.attachOutput(audioElem);
      await audio.initialize();
    });
    describe("plug", () => {
      describe("normally", () => {
        beforeEach(() => {
          audio.plug("peer01", peerAudioTrack as unknown as MediaStreamTrack);
        });
        it("should create AC input node", () => {
          expect(global.MediaStream).toHaveBeenCalled();
          expect(audioContext.createMediaStreamSource).toHaveBeenCalledWith(
            peerInputStream
          );
        });
        it("should not clone audio track", () => {
          expect(peerInputStream.addTrack).toHaveBeenCalledWith(peerAudioTrack);
          expect(peerInputStream.addTrack).not.toHaveBeenCalledWith(
            peerAudioTrackClone
          );
        });
        it("should connect peer input through gain node", () => {
          expect(audioContext.createGain).toHaveBeenCalled();
          expect(acSourceNode.connect).toHaveBeenCalledWith(acGainNode);
          expect(acGainNode.connect).toHaveBeenCalledWith(acBaseGainNode);
          expect(acBaseGainNode.connect).toHaveBeenCalledWith(
            acDestinationNode
          );
        });
      });
      describe("plugging twice the same peer", () => {
        beforeEach(async () => {
          audio.plug("peer01", peerAudioTrack as unknown as MediaStreamTrack);
          await clock.tickAsync(0);

          // @ts-expect-error typescript-migration
          global.MediaStream.mockClear();
          peerInputStream.addTrack.mockClear();
          audioContext.createMediaStreamSource.mockClear();
          audioContext.createGain.mockClear();
          acSourceNode.connect.mockClear();
          acGainNode.connect.mockClear();

          audio.plug("peer01", peerAudioTrack as unknown as MediaStreamTrack);
          await clock.tickAsync(0);
        });
        it("should ignore", () => {
          expect(global.MediaStream).not.toHaveBeenCalled();
          expect(peerInputStream.addTrack).not.toHaveBeenCalled();
          expect(audioContext.createMediaStreamSource).not.toHaveBeenCalled();
          expect(audioContext.createGain).not.toHaveBeenCalled();
          expect(acSourceNode.connect).not.toHaveBeenCalled();
          expect(acGainNode.connect).not.toHaveBeenCalled();
        });
      });
    });
    describe("unplug", () => {
      beforeEach(() => {
        audio.plug("peer01", peerAudioTrack as unknown as MediaStreamTrack);
      });
      it("should disconnect peer's audio stream", () => {
        audio.unplug("peer01");

        expect(acSourceNode.disconnect).toHaveBeenCalled();
        expect(acGainNode.disconnect).toHaveBeenCalled();
      });
      it("should ignore unplugging same peer twice", () => {
        audio.unplug("peer01");
        audio.unplug("peer01");

        expect(acSourceNode.disconnect).toHaveBeenCalledTimes(1);
        expect(acGainNode.disconnect).toHaveBeenCalledTimes(1);
      });
      it("should ignore unplugging disconnected peer", () => {
        audio.unplug("peer02");

        expect(acSourceNode.disconnect).not.toHaveBeenCalled();
        expect(acGainNode.disconnect).not.toHaveBeenCalled();
      });
    });
    describe("unplugAll", () => {
      beforeEach(async () => {
        audio.plug("peer01", peerAudioTrack as unknown as MediaStreamTrack);
        audio.plug("peer02", peerAudioTrack as unknown as MediaStreamTrack);
        await clock.tickAsync(0);
        audio.unplugAll();
        await clock.tickAsync(0);
      });

      it("should unplug everyone", () => {
        expect(acSourceNode.disconnect).toHaveBeenCalledTimes(1);
        expect(acGainNode.disconnect).toHaveBeenCalledTimes(1);
        expect(acSourceNode2.disconnect).toHaveBeenCalledTimes(1);
        expect(acGainNode2.disconnect).toHaveBeenCalledTimes(1);
      });
      it("should mute output", () => {
        expect(audioElem.volume).toEqual(0);
        expect(acBaseGainNode.gain.value).toEqual(0);
      });
      describe("next plug", () => {
        beforeEach(() => {
          audio.plug("peer01", peerAudioTrack as unknown as MediaStreamTrack);
        });
        it("should unmute", () => {
          expect(audioElem.volume).toEqual(1);
          expect(acBaseGainNode.gain.value).toEqual(1);
        });
      });
    });
  });
  describe("close", () => {
    beforeEach(async () => {
      await run();
      await audio.close();
    });
    it("should disconnect all nodes", () => {
      expect(acSourceNode.disconnect).toHaveBeenCalled();
      expect(acSourceNode2.disconnect).toHaveBeenCalled();
      expect(acSourceNode3.disconnect).toHaveBeenCalled();
      expect(acGainNode.disconnect).toHaveBeenCalled();
      expect(acGainNode2.disconnect).toHaveBeenCalled();
      expect(acGainNode3.disconnect).toHaveBeenCalled();
      expect(acDestinationNode.disconnect).toHaveBeenCalled();
      expect(audioContext.close).toHaveBeenCalled();
      expect(rtcPeerConnectionOne.close).toHaveBeenCalled();
      expect(rtcPeerConnectionTwo.close).toHaveBeenCalled();
    });
  });
  describe("setting volume levels", () => {
    beforeEach(async () => {
      await run();
    });
    describe("setPeerVolume", () => {
      it("should set peer's volume using gain node", () => {
        audio.setPeerVolume("peer01", 0.5);
        expect(acGainNode.gain.value).toEqual(0.5);
      });
    });
    describe("setBaseVolume", () => {
      beforeEach(() => {
        audio.setPeerVolume("peer01", 0.1);
        audio.setPeerVolume("peer02", 0.5);
        audio.setBaseVolume(0.33);
      });
      it("should adjust set gain node value", () => {
        expect(acBaseGainNode.gain.value).toEqual(0.33);
      });
      it("should not touch individual gain nodes", () => {
        expect(acGainNode.gain.value).toEqual(0.1);
        expect(acGainNode2.gain.value).toEqual(0.5);
        expect(acGainNode3.gain.value).toEqual(1);
      });
    });
  });
  describe("createVolumeMeter", () => {
    let track: MockedMediaStreamTrack;
    beforeEach(() => {
      audio = new AudioController();
      track = createMockMediaStreamTrack("audio", "track01");
      // @ts-expect-error typescript-migration
      vi.spyOn(VolumeMeter, "VolumeMeter").mockReturnValue({
        start: vi.fn(),
        close: vi.fn(),
      });
    });
    it("should not require explicit controller initialization", () => {
      expect(() => audio.createVolumeMeter(track as unknown as MediaStreamTrack)).not.toThrow();
      expect(VolumeMeter.VolumeMeter).toHaveBeenCalledWith(
        expect.any(Function),
        track
      );
    });
  });
});

function createRtcPeerConnection(sdpOffer: RTCSessionDescription | undefined, sdpAnswer?: RTCSessionDescription): MockedRTCPeerConnection {
  const rtcPeerConnection: MockedRTCPeerConnection = {
    connectionState: "new",
    addEventListener: vi.fn(),
    addTrack: vi.fn(),
    addIceCandidate: vi.fn(),
    close: vi.fn(),
    createAnswer: vi.fn(),
    createOffer: vi.fn(),
    onconnectionstatechange: null,
    onicecandidate: null,
    onstatechange: null,
    ontrack: null,
    removeEventListener: vi.fn(),
    setLocalDescription: vi.fn(),
    setRemoteDescription: vi.fn(),
  };
  if (sdpOffer) {
    rtcPeerConnection.createOffer.mockResolvedValueOnce(sdpOffer);
  }
  if (sdpAnswer) {
    rtcPeerConnection.createAnswer.mockResolvedValueOnce(sdpAnswer);
  }
  return rtcPeerConnection;
}

function createAcGainNode() {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      value: 1,
    },
  };
}

function createAcSourceNode(mediaStream: MockedMediaStream) {
  return {
    mediaStream,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function expectLoopbackConnectionCreated(
  localRtcPeerConnection: MockedRTCPeerConnection,
  remoteRtcPeerConnection: MockedRTCPeerConnection,
  sdpOfferMock: unknown,
  sdpAnswerMock: unknown,
  outputStreamAudioTrack: unknown
) {
  expect(RTCPeerConnection).toHaveBeenCalledTimes(2);
  expect(localRtcPeerConnection.onicecandidate).toEqual(expect.any(Function));
  expect(remoteRtcPeerConnection.onicecandidate).toEqual(expect.any(Function));
  expect(localRtcPeerConnection.addTrack).toHaveBeenCalledWith(
    outputStreamAudioTrack
  );
  expect(remoteRtcPeerConnection.ontrack).toEqual(expect.any(Function));
  expect(localRtcPeerConnection.createOffer).toHaveBeenCalled();
  expect(localRtcPeerConnection.setLocalDescription).toHaveBeenCalledWith(
    sdpOfferMock
  );
  expect(remoteRtcPeerConnection.setRemoteDescription).toHaveBeenCalledWith(
    sdpOfferMock
  );
  expect(remoteRtcPeerConnection.createAnswer).toHaveBeenCalled();
  expect(remoteRtcPeerConnection.setLocalDescription).toHaveBeenCalledWith(
    sdpAnswerMock
  );
  expect(localRtcPeerConnection.setRemoteDescription).toHaveBeenCalledWith(
    sdpAnswerMock
  );
}

type MockedRTCPeerConnection = {
  connectionState: string;
  addEventListener: Mock;
  addTrack: Mock;
  addIceCandidate: Mock;
  close: Mock;
  createAnswer: Mock;
  createOffer: Mock;
  onconnectionstatechange: (() => void) | null;
  onicecandidate: ((e: { candidate: RTCIceCandidate }) => void) | null;
  onstatechange: (() => void) | null;
  ontrack: ((e: { track: MediaStreamTrack }) => void) | null;
  removeEventListener: Mock;
  setLocalDescription: Mock;
  setRemoteDescription: Mock;
};

function triggerRtcPeerConnectionEvent(
  rtcPeerConnection: MockedRTCPeerConnection,
  eventName: "track" | "statechange" | "icecandidate" | "connectionstatechange",
  eventObject: unknown = { name: eventName }
) {
  const handlerProp = eventName === "icecandidate" ? rtcPeerConnection.onicecandidate
    : eventName === "track" ? rtcPeerConnection.ontrack
    : eventName === "statechange" ? rtcPeerConnection.onstatechange
    : rtcPeerConnection.onconnectionstatechange;
  // @ts-expect-error fixit
  handlerProp && handlerProp(eventObject);
  rtcPeerConnection.addEventListener.mock.calls.forEach(([e, h]) => {
    if (e === eventName) {
      h(eventObject);
    }
  });
}

type MockedRTCSessionDescription = {
  type?: string;
  sdp?: string;
};

function createMockSdp(type = "offer"): MockedRTCSessionDescription {
  return {
    type,
    sdp: "a=ice-ufrag:4a4f\r\na=ice-pwd:4a4f\r\n",
  };
}
