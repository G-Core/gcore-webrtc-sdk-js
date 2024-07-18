import type { types } from "mediasoup-client";
import { RtcMediaLabel } from "../types.js";

export function getRestartDelay(base: number) {
  return base - 500 + 1000 * Math.random();
}

/**
 * @internal
 */
export function getLabelMediaKind(label: RtcMediaLabel): types.MediaKind {
  switch (label) {
    case RtcMediaLabel.Mic:
      return "audio";
    case RtcMediaLabel.Camera:
      return "video";
    case RtcMediaLabel.ScreenSharing:
      return "video";
    default:
      throw new Error("Unsupported or non-streamable media label");
  }
}
