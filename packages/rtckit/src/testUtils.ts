import { EventEmitter } from "eventemitter3";
import type { types as ms } from "mediasoup-client";
import { MockedFunction, vi } from "vitest";

import { RtcMediaLabel, type RtcPermissions, RtcTransportDirection } from "./types.js";
import type { MessageHandler, SignalConnection } from "./signaling/types.js";
import type { MessageDto, RtcTransportCreatedPayload } from "./msg/types.js";
import type { ConsumerAppData, TransportAppData } from "./internal/types.js";
import { getLabelMediaKind } from "./internal/utils.js";

export interface MockedMsProducer {
  on(e: string, h: Function): void;
  off(e: string, h: Function): void;
  appData: {};
  close(): void;
  paused: boolean;
  closed: boolean;
  id: string;
  kind: ms.MediaKind;
  rtpParameters: ms.RtpParameters;
  track: MediaStreamTrack | null;
  pause(): void;
  resume(): void;
}

export interface MockedSignalConnection extends SignalConnection {
  readonly connected: boolean;
  close(): void;
  dispatch: MockedFunction<(m: MessageDto, cb?: Function) => void>;
  on(e: string, h: (...args: unknown[]) => void): void;
  off(e: string, h: (...args: unknown[]) => void): void;
  subscribe: MockedFunction<(h: MessageHandler) => void>;
}

export interface MockedMsDevice {
  canProduce: MockedFunction<() => boolean>;
  load: MockedFunction<(arg: { routerRtpCapabilities: ms.RtpCapabilities }) => Promise<void>>;
  loaded: boolean;
  rtpCapabilities: ms.RtpCapabilities;
  sctpCapabilities: ms.SctpCapabilities;
  createRecvTransport: MockedFunction<() => MockedMsTransport>;
  createSendTransport: MockedFunction<() => MockedMsTransport>;
}

export interface MockedMsTransport {
  appData: TransportAppData;
  close: MockedFunction<() => void>;
  consume: MockedFunction<() => Promise<MockedMsConsumer>>;
  emit(event: string, ...args: unknown[]): void;
  produce: MockedFunction<() => Promise<MockedMsProducer>>;
  restartIce: MockedFunction<() => Promise<void>>;
}

export interface MockedMsConsumer {
  appData: ConsumerAppData;
  id: string;
  producerId: string;
  closed: boolean;
  kind: ms.MediaKind;
  paused: boolean;
  track: MockedMediaStreamTrack;
  observer: EventEmitter;

  close: MockedFunction<() => void>;
  getStats: MockedFunction<() => Promise<RTCStatsReport>>;
  pause: MockedFunction<() => void>;
  resume: MockedFunction<() => void>;

  emit(e: string, ...args: any[]): void;
}

export interface MockedTransportConnector {
  close: MockedFunction<() => void>;
  getObject: MockedFunction<() => Promise<MockedMsTransport>>;
  off: MockedFunction<(e: string, h: Function) => void>;
  on: MockedFunction<(e: string, h: Function) => void>;
  setDevice: MockedFunction<(d: MockedMsDevice) => void>;
}

export const MP_ALL = {
  audio: true,
  video: true,
  share: true,
  data: true
};

export const MP_NONE = {
  audio: false,
  video: false,
  share: false,
  data: false,
};

export const ROUTER_RTP_CAPS = {
  codecs: [
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
    },
    {
      kind: "video",
      mimeType: "video/VP8",
      clockRate: 90000,
    },
    {
      kind: "video",
      mimeType: "video/rtx",
      clockRate: 90000,
      preferredPayloadType: 102,
    },
  ],
  headerExtensions: [
    {
      kind: "video",
      uri: "urn:ietf:params:rtp-hdrext:sdes:mid",
      preferredId: 1,
      direction: "sendrecv",
    },
    {
      kind: "video",
      uri: "urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id",
      direction: "recvonly",
      preferredId: 2,
    },
  ],
};

const nextTrackId = (function () {
  let nextId = 1;
  return () => `track${nextId++}`;
})();

const nextConsumerId = (function () {
  let nextId = 1;
  return () => `consumer${nextId++}`;
})();

export function createMockConsumer(
  label: RtcMediaLabel,
  peerId: string,
  id = nextConsumerId(),
): MockedMsConsumer {
  const kind = getLabelMediaKind(label);
  const ret = Object.assign(new EventEmitter(), {
    id,
    kind,
    closed: false,
    paused: false,
    producerId: "producer1",
    rtpReceiver: {},
    track: createMockMediaStreamTrack(kind),
    appData: {
      label,
      peerId,
      producerPaused: false,
      routerId: "router1",
      transportId: "transport1",
    },
    observer: new EventEmitter(),
    close: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getStats: vi.fn(),
  }) as MockedMsConsumer;
  ret.pause.mockImplementation(() => {
    ret.paused = true;
  });
  ret.resume.mockImplementation(() => {
    ret.paused = false;
  });
  return ret;
}

export function createMockTransport(
  id: string,
  appData = {},
): MockedMsTransport {
  return Object.assign(new EventEmitter(), {
    appData,
    closed: false,
    connectionState: "disconnected",
    id,
    observer: new EventEmitter(),
    produce: vi.fn(),
    produceData: vi.fn(),
    consume: vi.fn(),
    consumeData: vi.fn(),
    close: vi.fn(),
    getStats: vi.fn(),
    restartIce: vi.fn().mockImplementation(() => Promise.resolve()),
    updateIceServers: vi.fn(),
  }) as unknown as MockedMsTransport;
}

export interface MockedMediaStreamTrack {
  enabled: boolean;
  id: string;
  kind: ms.MediaKind;
  label: string;
  muted: boolean;
  readyState: "live" | "ended";
  onended: (() => void) | null;
  addEventListener(e: string, h: Function): void;
  removeEventListener(e: string, h: Function): void;
  clone: MockedFunction<() => MockedMediaStreamTrack>;
  stop: MockedFunction<() => void>;
}

export interface MockedMediaStream{
  id: string;
  addTrack: MockedFunction<(t: MockedMediaStreamTrack) => void>;
  getTracks: MockedFunction<() => MockedMediaStreamTrack[]>;
  removeTrack: MockedFunction<(t: MockedMediaStreamTrack) => void>;
}

type MediaStreamTrackProps = {
  label: string;
  kind: "audio" | "video";
  muted: boolean;
  enabled: boolean;
  readyState: "live" | "ended";
};

export function createMockMediaStreamTrack(
  kind: "audio" | "video",
  id = nextTrackId(),
  props: Partial<MediaStreamTrackProps> = {}
): MockedMediaStreamTrack {
  const track: MockedMediaStreamTrack = {
    label: `Built-in ${kind} device`,
    muted: false,
    enabled: true,
    readyState: "live",
    ...props,
    id,
    kind,
    onended: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    clone: vi.fn(),
    stop: vi.fn(),
  };
  track.clone.mockImplementation(() => {
    const {
      enabled,
      label,
      muted,
      readyState,
    } = track;
    return createMockMediaStreamTrack(kind, undefined, {
      enabled,
      label,
      muted,
      readyState,
    });
  });
  return track;
}

export function createMockProducer(id: string, kind: ms.MediaKind, appData = {}): MockedMsProducer {
  // @ts-ignore
  return Object.assign(new EventEmitter(), {
    appData,
    id,
    kind,
    closed: false,
    paused: false,
    maxSpatialLayer: 1,
    rtpParameters: null,
    rtpSender: null,
    track: createMockMediaStreamTrack(kind, nextTrackId()),
    pause: vi.fn(),
    resume: vi.fn(),
    close: vi.fn(),
    getStats: vi.fn(),
    replaceTrack: vi.fn(),
    setMaxSpatialLayer: vi.fn(),
    setRtpEncodingParameters: vi.fn(),
    observer: new EventEmitter(),
  });
}

export function createMockConnection(): MockedSignalConnection {
  const result = Object.assign(new EventEmitter(), {
    connected: true,
    close: vi.fn(),
    dispatch: vi.fn(),
    subscribe: vi.fn(),
  });
  vi.spyOn(result, "on");
  vi.spyOn(result, "off");
  return result;
}

export const ENDPOINT_RTP_CAPS = {
  codecs: [
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 16000,
    },
  ],
  headerExtensions: [
    {
      kind: "video",
      mimeType: "video/vp8",
      uri: "uri",
      preferredId: 1,
    },
  ],
};

export const ENDPOINT_SCTP_CAPS = {
  numStreams: {
    OS: 1,
    MIS: 100,
  },
};

export function createMockMsDevice(): MockedMsDevice {
  const result = {
    loaded: false,
    canProduce: vi.fn(),
    load: vi.fn(),
    rtpCapabilities: ENDPOINT_RTP_CAPS,
    sctpCapabilities: ENDPOINT_SCTP_CAPS,
    createRecvTransport: vi.fn(),
    createSendTransport: vi.fn(),
  };
  result.load.mockImplementation(() => {
    result.loaded = true;
    return Promise.resolve();
  });
  return result as MockedMsDevice;
}

export function receiveTransportCreated(props: Partial<RtcTransportCreatedPayload>, conn: MockedSignalConnection) {
  receiveServerMessage({
    type: "r:i:transportCreated",
    data: {
      dir: RtcTransportDirection.Recv,
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
      ...props
    },
  } as MessageDto, conn);
}

export function receiveServerMessage(msg: MessageDto, conn: MockedSignalConnection) {
  for (const [h] of conn.subscribe.mock.calls) {
    h.call(null, msg)
  }
}

export function receiveRouterCaps(conn: MockedSignalConnection) {
  receiveServerMessage({
    type: "r:i:routerCaps",
    data: {
      rtpCapabilities: ROUTER_RTP_CAPS,
    },
  } as MessageDto, conn);
}

export function receivePermissions(
  available: RtcPermissions = MP_ALL,
  current: RtcPermissions = MP_ALL,
  conn: MockedSignalConnection
) {
  receiveServerMessage({
    type: "r:i:permissions",
    data: {
      available,
      current
    }
  } as MessageDto, conn);
}

export function receiveConsumerCreated(data: unknown, conn: MockedSignalConnection) {
  receiveServerMessage({
    type: "r:i:consumerCreated",
    data,
  } as MessageDto, conn);
}

const nextId = function () {
  let counter = 1;
  return function () {
    return `${counter++}`;
  };
}();

export function createMockMediaStream(id = nextId()): MockedMediaStream {
  return {
    id,
    addTrack: vi.fn(),
    getTracks: vi.fn().mockReturnValue([]),
    removeTrack: vi.fn(),
  };
}
