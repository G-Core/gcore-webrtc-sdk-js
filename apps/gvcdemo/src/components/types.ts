import type { RtcMediaLabel } from "@gcorevideo/rtckit"
export type CallSessionParams = {
  // clientHost: string
  peerId: string
  roomId: string
}

export type RtcMediaPermissions = Record<RtcMediaLabel, boolean>

export enum JoinRequestStatus {
  New = 0,
  Approved = 1,
  Dismissed = 2
}

export type JoinRequestInfo = {
  peerId: string
  displayName: string
  status: JoinRequestStatus
}
