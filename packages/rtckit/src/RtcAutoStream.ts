// An outgoing stream that recovers automatically after reconnects
import { EventEmitter } from "eventemitter3";

import { RtcClientT } from "./RtcClient.js";
import { RtcMediaLabel, RtcOutgoingStreamEvents, RtcOutgoingStreamOptions, RtcOutgoingStreamT } from "./types.js";
import { getRestartDelay } from "./internal/utils.js";

export class RtcAutoStream implements RtcOutgoingStreamT {
  private closed = false;

  private emitter = new EventEmitter();

  private maxSpatialLayer = -1;

  #paused = false;

  private stream: RtcOutgoingStreamT | null = null;

  public on = this.emitter.on.bind(this.emitter);

  public off = this.emitter.off.bind(this.emitter);

  constructor(
    private rtcClient: RtcClientT,
    public readonly label: RtcMediaLabel,
    private track: MediaStreamTrack,
    private options?: RtcOutgoingStreamOptions
  ) {
    this.sendStream();
  }

  get paused() {
    return this.#paused;
  }

  close() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    if (this.stream) {
      this.stream.close();
      this.stream = null;
    }
    this.emitter.removeAllListeners();
  }

  pause() {
    this.#paused = true;
    if (this.stream) {
      return this.stream.pause();
    }
    return Promise.resolve();
  }

  requestLoopback() {
    if (this.stream) {
      return this.stream.requestLoopback();
    }
    return Promise.resolve();
  }

  resume() {
    this.#paused = false;
    if (this.stream) {
      return this.stream.resume();
    }
    return Promise.resolve();
  }

  setMaxSpatialLayer(layer: number): void {
    this.maxSpatialLayer = layer;
    if (this.stream) {
      this.stream.setMaxSpatialLayer(layer);
    }
  }

  setMediaTrack(track: MediaStreamTrack): Promise<void> {
    this.track = track;
    if (this.stream) {
      return this.stream.setMediaTrack(track);
    }
    return Promise.resolve();
  }

  private sendStream() {
    if (this.closed) {
      return;
    }
    this.rtcClient.sendStream(this.label, this.track, this.options)
      .then((stream) => {
        this.stream = stream;
        if (this.maxSpatialLayer >= 0) {
          stream.setMaxSpatialLayer(this.maxSpatialLayer);
        }
        if (!this.#paused) {
          stream.resume(); // TODO check if needed
        } else {
          stream.pause();
        }
        stream.on(RtcOutgoingStreamEvents.Close, () => {
          if (this.closed) {
            return;
          }
          this.stream = null;
          setTimeout(() => {
            this.sendStream();
          }, getRestartDelay(1000));
        });
        // TODO emit ready event
      })
      .catch(e => {
        // TODO
      })
  }
}
