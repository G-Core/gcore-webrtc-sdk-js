import sdpTransform from "sdp-transform";
import type { MediaAttributes } from "sdp-transform";

import { CodecMatch } from "./types";

type RtpPayloadDesc = MediaAttributes['rtp'][number];
type RtpPayloadFormatDesc = MediaAttributes['fmtp'][number];

// TODO test

export function restrictCodecs(sdp: string, kind: "audio" | "video", codecs: Array<string | CodecMatch>): string {
  const parsed = sdpTransform.parse(sdp);
  const msection = parsed.media.find((m) => m.type === kind);
  if (!msection) {
    return sdp;
  }
  const filteredPayloadTypes: number[] = [];
  const normalizedCodecs = normalizeCodecs(codecs);
  const fmtps = msection.fmtp.reduce((acc: Record<number, RtpPayloadFormatDesc>, fmtp: RtpPayloadFormatDesc) => {
    acc[fmtp.payload] = fmtp;
    return acc;
  }, {});
  msection?.rtp.forEach((codec) => {
    if (!matchCodec(codec, normalizedCodecs, fmtps[codec.payload])) {
      filteredPayloadTypes.push(codec.payload);
    }
  });
  if (filteredPayloadTypes.length) {
    msection.rtp = msection.rtp.filter((r) => !filteredPayloadTypes.includes(r.payload));
    msection.fmtp = msection.fmtp.filter((fmtp) => !filteredPayloadTypes.includes(fmtp.payload));
    if (msection.payloads) {
      msection.payloads = msection.payloads
        .split(" ")
        .map(Number)
        .filter((p) => p && !filteredPayloadTypes.includes(p))
        .join(" ");
    }
  }
  return sdpTransform.write(parsed);
}

function normalizeCodecs(codecs: Array<string | CodecMatch>): CodecMatch[] {
  return codecs.map((c) => typeof c === "string" ? { codec: c } : c);
}

function matchCodec(codec: RtpPayloadDesc, codecs: CodecMatch[], fmtp: RtpPayloadFormatDesc): boolean {
  return codecs.some((c) => {
    if (c.codec !== codec.codec) {
      return false;
    }
    if (c.params) {
      if (!fmtp) {
        return false;
      }
      for (const [key, value] of Object.entries(c.params)) {
        if (!fmtp.config.includes(`${key}=${value}`)) {
          return false;
        }
      }
    }
    return true;
  });
}
