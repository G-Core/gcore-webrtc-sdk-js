import { MediaKind } from "../types.js";
import { WebrtcStreamParams } from "./types.js";

export function closeMediaStream(stream: MediaStream) {
  stream.getTracks().forEach((t) => {
    t.stop();
    stream.removeTrack(t);
  });
}

export function looseMediaDeviceConstraints(kind: MediaKind, params: WebrtcStreamParams): WebrtcStreamParams {
  if (kind === "audio") {
    return { ...params, audio: !!params.audio };
  }
  return { ...params, video: true };
}
