export class RemotePeerView {
  track: MediaStreamTrack | null = null

  audioTrack: MediaStreamTrack | null = null

  displayName = ""

  role = "default"

  hidden = false

  constructor(public readonly id: string) {}

  get hasAudio() {
    return !!this.audioTrack
  }
}

export type PeerInfo = {
  id: string
  track: MediaStreamTrack | null
  audioTrack: MediaStreamTrack | null
  displayName: string
  hidden: boolean
  role: string
}
