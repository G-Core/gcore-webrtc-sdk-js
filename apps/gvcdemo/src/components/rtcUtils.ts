import { RtcClient, type SignalConnection } from "@gcorevideo/rtckit"

export function useRtcClient(conn: SignalConnection) {
  const rtcClient = new RtcClient(conn)

  return rtcClient
}
