import { ApiService } from "./internal/ApiService.js";
import { Session, SessionEvents } from "./Session.js";
import {RtcClient } from "./RtcClient.js";
import { SocketConnection } from "./signaling/SocketConnection.js";

export type RoomClientConfig = {
  apiHost?: string;
  clientHost?: string;
  clientKey?: string;
}

/**
 * @property {token} @see {@link https://github.com/G-Core/vp-meet-sdk/blob/main/packages/rtckit/README.md#client-keys-and-tokens}
 */
export type RoomConnectionOptions = {
  peerId?: string;
  token?: string;
}

const CONNECT_TIMEOUT = 60000;

const DEFAULT_CONFIG = {
  apiHost: "https://api.gcore.com/streaming/videocalls",
  clientHost: "meet.gcorelabs.com",
}

/**
 * Top level component to easely setup and run a real-time communication session.
 */
export class RoomClient {
  private apiService: ApiService;

  constructor(private config: RoomClientConfig) {
    this.apiService = new ApiService(this.config.apiHost || DEFAULT_CONFIG.apiHost);
  }

  /**
   * Connect to a call room (join existing or create new session)
   *
   * @param roomId  Public room ID
   * @param options
   * @returns
   */
  async connect(roomId: string, options?: RoomConnectionOptions): Promise<Session> {
    const {
      peerId = generatePeerId(),
      token,
    } = options || {};
    const { server, iceServers, token: st } = await this.apiService.initSession({
      roomId,
      hostname: this.config.clientHost || DEFAULT_CONFIG.clientHost,
      peerId,
      token,
    })
    const conn = new SocketConnection(server, st);
    const rtcClient = new RtcClient(conn);
    rtcClient.setIceServers(iceServers)

    const sess = new Session(rtcClient, conn);
    conn.connect();

    return new Promise((resolve, reject) => {
      sess.on(SessionEvents.Connected, () => resolve(sess));
      setTimeout(() => reject(new Error("Failed to connect")), CONNECT_TIMEOUT);
    });
  }
}

function generatePeerId() {
  const storedPeerId = sessionStorage.getItem("peerId");
  if (storedPeerId) {
    return storedPeerId;
  }
  const newPeerId = crypto.randomUUID();
  sessionStorage.setItem("peerId", newPeerId);
  return newPeerId;
}
