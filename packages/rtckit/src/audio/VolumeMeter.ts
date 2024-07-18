type AudioContextThunk = () => Promise<AudioContext>;

type VolumeCallback = (level: number) => void;

export type VolumeMeterT = {
  close(): void;
  start(cb: VolumeCallback): void;
}

export class VolumeMeter {
  private analyserNode: AnalyserNode | null = null;

  private closed = false;

  private sourceNode: MediaStreamAudioSourceNode | null = null;

  private stream: MediaStream;

  private timerId: number | null = null;

  /**
   * @param {AudioContextThunk} acThunk
   * @param {MediaStreamTrack} mediaTrack
   */
  constructor(private acThunk: AudioContextThunk, mediaTrack: MediaStreamTrack) {
    const newTrack = mediaTrack.clone();
    newTrack.enabled = true;
    const stream = new MediaStream([newTrack]);
    this.stream = stream;
  }

  start(cb: VolumeCallback) {
    // TODO param MediaStreamTrack
    this.acThunk().then((audioContext) => {
      if (this.closed) {
        return;
      }
      const analyserNode = audioContext.createAnalyser();
      this.analyserNode = analyserNode;
      analyserNode.fftSize = 32;
      const buffer = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.sourceNode = audioContext.createMediaStreamSource(this.stream);
      this.sourceNode.connect(this.analyserNode);
      if (!this.timerId) {
        this.timerId = window.setInterval(() => {
          analyserNode.getByteFrequencyData(buffer);
          let volume = 0;
          for (let i = 0; i < buffer.length; i++) {
            volume += buffer[i];
          }
          cb(volume / buffer.length / 255);
        }, 100);
        audioContext.resume();
      }
    });
  }

  close() {
    this.closed = true;

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.stream.getTracks().forEach((t) => {
      this.stream.removeTrack(t);
      t.stop();
    });
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
  }
}
  