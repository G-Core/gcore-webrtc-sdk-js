/**
 * @internal
 */
export type SessionConfig = {
  iceServers: Array<RTCIceServer>;
  server: string;
  token: string;
};

/**
 * @deprecated - Will use new common Streaming API
 */
export type SessionInitParams = {
  hostname: string;
  roomId: string;
  webinar?: boolean;
  isParticipant?: boolean;
  peerId?: string;
  token?: string;
  pincode?: string;
  retryDuration?: number; // ms
};
