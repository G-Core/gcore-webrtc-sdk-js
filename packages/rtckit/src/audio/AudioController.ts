import { EventEmitter } from "eventemitter3";
import { VolumeMeter } from "./VolumeMeter.js";

import {
  AudioContextNotReadyError,
  AudioControllerError,
  AudioControllerHookError,
  AudioControllerStartFailedError,
  AudioOutputNotAttachedError,
  AudioOutputSelectionUnsupportedError,
} from "./errors.js";
import { checkSetAudioSinkId } from "./utils.js";
import { AudioControllerEvents, AudioControllerOptions } from "./types.js";

import { reportError, trace } from "../trace/index.js";

/**
 * INITIAL initialize -> INITIALIZED
 * INITIAL attachOutput -> OUTPUT_ATTACHED
 * INITIALIZED attachOutput -> STARTING
 * OUTPUT_ATTACHED initialize -> STARTING
 * STARTING got output track -> RUNNING
 * RUNNING connection failed -> FAILED
 * STARTING connection failed -> FAILED
 * _any_ close -> CLOSED
 */
enum State {
  INITIAL = "INITIAL",
  INITIALIZED = "INITIALIZED",
  OUTPUT_ATTACHED = "OUTPUT_ATTACHED",
  RUNNING = "RUNNING",
  FAILED = "FAILED",
  STARTING = "STARTING",
  CLOSED = "CLOSED", // TODO remove
}

const TRACE = "lib.rtckit.audio.AudioController";

type ContextReadyCallback = (ac: AudioContext) => void;

export class AudioController {
  private emitter = new EventEmitter();

  on = this.emitter.on.bind(this.emitter);

  off = this.emitter.off.bind(this.emitter);

  private state = State.INITIAL;

  private audioContext: AudioContext | null = null;

  private audioOutput: MediaStreamAudioDestinationNode | null = null;

  private baseVolume = 1;

  private audioSourceNodes: Map<string, MediaStreamAudioSourceNode> = new Map();

  private gainNodes: Map<string, GainNode> = new Map();

  private baseGain: GainNode | null = null;

  private started = false;

  private loopbackIn: RTCPeerConnection | null = null;

  private loopbackOut: RTCPeerConnection | null = null;

  private loopbackRestartCounter = 0;

  private loopbackStream: MediaStream | null = null;

  private onContextReady: ContextReadyCallback[] = [];

  private onContextClose: VoidFunction[] = [];

  private peerVolumes: Map<string, number> = new Map();

  private sound: HTMLMediaElement | null = null;

  constructor(private options: AudioControllerOptions = {}) {}

  async attachOutput(audioElem: HTMLAudioElement): Promise<void> {
    if (![State.INITIAL, State.INITIALIZED].includes(this.state)) {
      return;
    }
    this.sound = audioElem;
    if (this.state === State.INITIALIZED) {
      await this.#getAudioContext()
        .then((ac) => this.#connectOutput(ac, audioElem))
        .catch((e) => {
          reportError(new AudioControllerError(e));
        });
    } else {
      this.#setState(State.OUTPUT_ATTACHED);
    }
  }

  attachSinkId(sinkId: string) {
    if (!this.sound) {
      return;
    }
    if (this.isOutputSelectionAllowed(this.sound)) {
      const previousSinkId = this.sound.sinkId;
      this.sound
        .setSinkId(sinkId)
        .catch((error: unknown) => {
          reportError(new AudioControllerError(error));
          // jump back to the previous output device
          // @ts-expect-error typescript-migration
          this.sound.setSinkId(previousSinkId);
        });
    } else {
      reportError(new AudioOutputSelectionUnsupportedError());
    }
  }

  async close() {
    await this.reset();
    this.#setState(State.CLOSED);
    this.emitter.removeAllListeners();
  }

  async reset() {
    this.#setState(State.INITIAL);
    if (this.sound) {
      await this.sound.pause();
      const srcObject = this.sound.srcObject;
      if (srcObject) {
        (srcObject as MediaStream).getTracks().forEach((t) => {
          t.stop();
        });
      }
      this.sound = null;
    }
    this.audioSourceNodes.forEach((audioSourceNode) =>
      audioSourceNode.disconnect()
    );
    this.audioSourceNodes.clear();

    this.gainNodes.forEach((analyzer) => analyzer.disconnect());
    this.gainNodes.clear();

    if (this.baseGain) {
      this.baseGain.disconnect();
      this.baseGain = null;
    }
    if (this.audioOutput) {
      this.audioOutput.stream.getTracks().forEach((t) => {
        t.stop();
      });
      this.audioOutput.disconnect();
      this.audioOutput = null;
    }
    if (this.audioContext) {
      if (this.audioContext.state !== "closed") {
        await this.audioContext.close();
      }
      this.audioContext = null;
    }
    if (this.loopbackStream) {
      this.loopbackStream.getTracks().forEach((t) => {
        t.stop();
        // @ts-expect-error typescript-migration
        this.loopbackStream.removeTrack(t);
      });
      this.loopbackStream = null;
    }
    if (this.loopbackIn) {
      this.loopbackIn.close();
      this.loopbackIn = null;
    }
    if (this.loopbackOut) {
      this.loopbackOut.close();
      this.loopbackOut = null;
    }
    this.contextClosed();
  }

  createVolumeMeter(mediaTrack: MediaStreamTrack): VolumeMeter {
    return new VolumeMeter(
      () =>
        new Promise((resolve, reject) => {
          if (this.audioContext) {
            resolve(this.audioContext);
          } else {
            this.onContextReady.push(resolve);
            this.onContextClose.push(reject);
          }
        }),
      mediaTrack
    );
  }

  /**
   * @returns {Promise<void>}
   */
  async initialize() {
    if (![State.INITIAL, State.OUTPUT_ATTACHED].includes(this.state)) {
      return;
    }
    const audioContext = new AudioContext();
    this.audioContext = audioContext;
    this.audioOutput = this.audioContext.createMediaStreamDestination();
    this.baseGain = this.audioContext.createGain();
    this.baseGain.connect(this.audioOutput);

    this.contextReady(audioContext);

    if (this.state === State.OUTPUT_ATTACHED) {
      await this.getAudioElement()
        .then((audioElem) => this.#connectOutput(audioContext, audioElem))
        .then(
          () => {
            this.#setState(State.INITIALIZED);
          },
          (e) => {
            reportError(new AudioControllerError(e));
          }
        );
    } else {
      // INITIAL
      this.#setState(State.OUTPUT_ATTACHED);
      this.#setState(State.INITIALIZED);
    }
  }

  #setState(newState: State) {
    switch (newState) {
      case State.CLOSED:
      case State.FAILED:
      case State.INITIAL:
        this.state = newState;
        break;
      case State.INITIALIZED:
        if ([State.INITIAL, State.OUTPUT_ATTACHED].includes(this.state)) {
          this.state = newState;
        }
        break;
      case State.OUTPUT_ATTACHED:
        if ([State.INITIAL].includes(this.state)) {
          this.state = newState;
        }
        break;
      case State.STARTING:
        if (
          [State.FAILED, State.RUNNING, State.INITIALIZED].includes(this.state)
        ) {
          this.state = newState;
        }
        break;
      case State.RUNNING:
        if ([State.INITIALIZED, State.STARTING].includes(this.state)) {
          this.state = newState;
        }
        break;
    }
  }

  plug(peerId: string, track: MediaStreamTrack) {
    if (this.audioSourceNodes.has(peerId)) {
      trace(`${TRACE}.plug.alreadyPlugged`);
      return;
    }
    Promise.all([this.#getAudioContext(), this.#getBaseGainNode()])
      .then(([audioContext, baseGain]) => {
        const stream = new MediaStream();
        stream.addTrack(track);

        const audioSourceNode = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        if (this.peerVolumes.has(peerId)) {
          gainNode.gain.value = this.peerVolumes.get(peerId) as number;
        }

        audioSourceNode.connect(gainNode);
        gainNode.connect(baseGain);

        this.audioSourceNodes.set(peerId, audioSourceNode);
        this.gainNodes.set(peerId, gainNode);

        if (this.audioSourceNodes.size === 1) {
          // first audio stream plugged
          this.unmute();
        }
      })
      .catch((error) => reportError(new AudioControllerError(error)));
  }

  setBaseVolume(volumeRatio: number) {
    if (volumeRatio === this.baseVolume) {
      return;
    }
    this.baseVolume = volumeRatio;
    this.#getBaseGainNode()
      .then((baseGain) => {
        baseGain.gain.value = volumeRatio;
      })
      .catch((e) => reportError(new AudioControllerError(e)));
  }

  setPeerVolume(peerId: string, volume: number) {
    this.peerVolumes.set(peerId, volume);
    const gainNode = this.gainNodes.get(peerId);
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }

  /**
   * Start running context and playing audio.
   * The reason for this method is that in the browsers it's convential that audio output can only be started after
   * user has made some interaction with page.
   * Therefore the method should be called once user clicks some interactive element of the UI.
   */
  async start() {
    // TODO check it
    if (this.started) {
      // This prevents double-start
      // TODO check if it does any harm, drop if not
      // return;
    }
    this.started = true;
    return Promise.all([this.#getAudioContext(), this.getAudioElement()])
      .then(([ac, audioElem]) => this.#playOutput(ac, audioElem))
      .catch((e) => {
        reportError(new AudioControllerStartFailedError(e));
      });
  }

  /**
   * Unplug peer's audio from audio context
   */
  unplug(peerId: string) {
    const analyzer = this.gainNodes.get(peerId);
    if (analyzer) {
      analyzer.gain.value = 0;
      analyzer.disconnect();
      this.gainNodes.delete(peerId);
    }

    const audioSourceNode = this.audioSourceNodes.get(peerId);
    if (audioSourceNode) {
      audioSourceNode.disconnect();
      this.audioSourceNodes.delete(peerId);
    }

    // TODO reset peer volume
  }

  unplugAll() {
    trace(`${TRACE}.unplugAll`, {
      state: this.state,
    });
    this.mute();
    for (const peerId of this.audioSourceNodes.keys()) {
      this.unplug(peerId);
    }
  }

  /**
   * @returns {Promise<MediaStream>}
   */
  async #createOutput() {
    return this.getAudioOutput().then((audioOutput) => {
      const { echoCancellationLoopback = true } = this.options;
      if (echoCancellationLoopback) {
        return this.#createLoopBackStream(audioOutput.stream.getTracks()[0]);
      }
      this.#setState(State.RUNNING);
      return audioOutput.stream;
    });
  }

  async #connectOutput(audioContext: AudioContext, audioElem: HTMLMediaElement) {
    const output = await this.#createOutput();
    audioContext.onstatechange = () => this.#onStateChange(audioContext);
    audioElem.srcObject = output;
    if (this.started) {
      await this.#playOutput(audioContext, audioElem);
    }
  }

  #playOutput(audioContext: AudioContext, audioElem: HTMLMediaElement) {
    return audioElem.play().then(() => this.#resumeAudioContext(audioContext));
  }

  /**
   * @param {AudioContext} audioContext
   */
  #onStateChange(audioContext: AudioContext) {
    const acState = audioContext.state;
    trace(`${TRACE}.contextStateChange`, {
      state: this.state,
      acState,
    });
    // TODO automatically resume on "interrupted" state
    if (acState !== "closed") {
      this.emitter.emit(AudioControllerEvents.StateChange, acState === "running");
    }
  }

  #resumeAudioContext(audioContext: AudioContext) {
    audioContext.resume();
  }

  #getAudioContext(): Promise<AudioContext> {
    return new Promise((resolve, reject) => {
      if (!this.audioContext) {
        reject(new AudioContextNotReadyError());
      } else {
        resolve(this.audioContext);
      }
    });
  }

  #getBaseGainNode(): Promise<GainNode> {
    return new Promise((resolve, reject) => {
      if (!this.baseGain) {
        reject(new AudioContextNotReadyError());
      } else {
        resolve(this.baseGain);
      }
    });
  }

  async #createLoopBackStream(inputTrack: MediaStreamTrack): Promise<MediaStream> {
    this.loopbackStream = new MediaStream();
    await this.#createLoopbackConnection(this.loopbackStream, inputTrack);
    return this.loopbackStream;
  }

  #onLoopbackFail(loopbackStream: MediaStream, inputTrack: MediaStreamTrack) {
    trace(`${TRACE}.onLoopbackFail`, {
      state: this.state,
    });
    if (this.state === State.CLOSED || this.state === State.FAILED) {
      return;
    }
    this.#setState(State.FAILED);
    if (this.loopbackIn) {
      this.loopbackIn.close();
      this.loopbackIn = null;
    }
    if (this.loopbackOut) {
      this.loopbackOut.close();
      this.loopbackOut = null;
    }
    loopbackStream.getTracks().forEach((t) => loopbackStream.removeTrack(t));
    const delay = Math.min(8, 1 << this.loopbackRestartCounter++) * 1000;
    setTimeout(() => {
      this.#createLoopbackConnection(loopbackStream, inputTrack);
    }, delay);
    trace(`${TRACE}.onLoopbackFail.willRestart`, {
      state: this.state,
    });
  }

  async #createLoopbackConnection(loopbackStream: MediaStream, inputTrack: MediaStreamTrack) {
    if (this.state === State.CLOSED) {
      return;
    }
    const offerOptions = {
      offerVideo: true,
      offerAudio: true,
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    };

    this.loopbackIn = new RTCPeerConnection();
    this.loopbackOut = new RTCPeerConnection();

    this.loopbackIn.onicecandidate = (e) =>
      e.candidate &&
      // @ts-expect-error typescript-migration
      this.loopbackOut.addIceCandidate(new RTCIceCandidate(e.candidate));
    this.loopbackOut.onicecandidate = (e) =>
      e.candidate &&
      // @ts-expect-error typescript-migration
      this.loopbackIn.addIceCandidate(new RTCIceCandidate(e.candidate));

    this.loopbackOut.ontrack = (e) => {
      loopbackStream.addTrack(e.track);
      this.loopbackRestartCounter = 0;
      if (this.state !== State.CLOSED) {
        this.#setState(State.RUNNING);
      }
    };

    this.loopbackIn.addTrack(inputTrack);

    const offer = await this.loopbackIn.createOffer(offerOptions);
    await this.loopbackIn.setLocalDescription(offer);

    await this.loopbackOut.setRemoteDescription(offer);
    const answer = await this.loopbackOut.createAnswer();
    await this.loopbackOut.setLocalDescription(answer);

    await this.loopbackIn.setRemoteDescription(answer);

    this.#setState(State.STARTING);

    this.#handleLoopbackFailure(this.loopbackIn, loopbackStream, inputTrack);
    this.#handleLoopbackFailure(this.loopbackOut, loopbackStream, inputTrack);
  }

  #handleLoopbackFailure(loopbackConnection: RTCPeerConnection, loopbackStream: MediaStream, inputTrack: MediaStreamTrack) {
    loopbackConnection.onconnectionstatechange = () => {
      const connectionState = loopbackConnection.connectionState;
      trace(`${TRACE}.handleLoopbackFailure`, {
        connectionState,
        state: this.state,
      });
      if (connectionState === "failed") {
        this.#onLoopbackFail(loopbackStream, inputTrack);
      }
    };
  }

  private isOutputSelectionAllowed(audioElem: HTMLMediaElement): boolean {
    return checkSetAudioSinkId(audioElem);
  }

  private mute() {
    if (this.sound) {
      this.sound.volume = 0;
    }
    if (this.baseGain) {
      this.baseGain.gain.value = 0;
    }
  }

  private unmute() {
    if (this.sound) {
      this.sound.volume = 1;
    }
    if (this.baseGain) {
      this.baseGain.gain.value = this.baseVolume;
    }
  }

  private getAudioElement(): Promise<HTMLMediaElement> {
    return new Promise((resolve, reject) => {
      if (!this.sound) {
        reject(new AudioOutputNotAttachedError());
      } else {
        resolve(this.sound);
      }
    });
  }

  private getAudioOutput(): Promise<MediaStreamAudioDestinationNode> {
    return new Promise((resolve, reject) => {
      if (!this.audioOutput) {
        reject(new AudioContextNotReadyError());
      } else {
        resolve(this.audioOutput);
      }
    });
  }

  private contextReady(ac: AudioContext) {
    this.onContextReady.slice().forEach((cb) => {
      try {
        cb(ac);
      } catch (e) {
        reportError(new AudioControllerHookError(e));
      }
    });
  }

  private contextClosed() {
    this.onContextClose
      .splice(0, this.onContextClose.length)
      .forEach((cb) => {
        try {
          cb();
        } catch (e) {
          reportError(new AudioControllerHookError(e));
        }
      });
  }
}

export default AudioController;
