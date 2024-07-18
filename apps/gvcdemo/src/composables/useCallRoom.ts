import { readonly, ref } from "vue"

import {
  AudioController,
  type ConnectedPayload,
  type RtcPeerStreamAvailableData,
  type RtcPeerStreamUnavailableData,
  RoomClient,
  type RoomClientConfig,
  RtcClientEvents,
  RtcMediaLabel,
  type RtcOutgoingStreamT,
  SessionEvents,
  type SessionT,
  SignalConnectionEvents,
  PeersControllerEvents,
  type RemotePeerT,
  RemotePeerEvents
} from "@gcorevideo/rtckit"
import { logger } from "@/components/Logger"

import type { CallSessionParams } from "@/components/types"
// import { type PeerInfo, RemotePeerView } from "@/lib/RemotePeerView"

type PeerInfo = {
  id: string
  track: MediaStreamTrack | null
  audioTrack: MediaStreamTrack | null
  displayName: string
  hidden: boolean
  role: string
  domain: string
}

export function useCallRoom(config: RoomClientConfig) {
  const audioController = new AudioController()

  const audioTrack = ref<MediaStreamTrack | null>(null)
  const videoTrack = ref<MediaStreamTrack | null>(null)
  const displayName = ref("")
  const peers = ref<PeerInfo[]>([])
  const joined = ref(false)
  const joining = ref(false)
  const connected = ref(false)
  const moderator = ref(false)
  const waitingRoom = ref(false)
  const outgoingVideoStream = ref<RtcOutgoingStreamT>()
  const outgoingAudioStream = ref<RtcOutgoingStreamT>()

  let room: SessionT | undefined

  async function connect(params: CallSessionParams) {
    if (!isValidParams(params)) {
      throw new Error("Invalid connection params")
    }

    const roomClient = new RoomClient(config)
    const { roomId, ...options } = params
    room = await roomClient.connect(roomId, options)

    connected.value = true

    room.conn.on(SignalConnectionEvents.Connect, () => {
      logger.debug("connected to room")
    })
    room.conn.on(SignalConnectionEvents.Disconnect, () => {
      logger.debug("disconnected")
      connected.value = false
      reset()
    })
    room.conn.on(SignalConnectionEvents.Close, () => {
      logger.debug("connection closed")
      connected.value = false
      reset()
    })

    room.rtc.on(RtcClientEvents.ProducingReady, onProducingReady)
    room.rtc.on(RtcClientEvents.PeerStreamAvailable, onPeerStreamAvailable)
    room.rtc.on(RtcClientEvents.PeerStreamUnavailable, onPeerStreamUnavailable)

    room.on(SessionEvents.Connected, onConnectedToRoom)
    room.on(SessionEvents.Joined, onJoined)
    room.on(SessionEvents.WaitingRoomStateChange, onWaitingRoomSet)
    room.peers.on(PeersControllerEvents.NewPeer, (peer: RemotePeerT) => {
      if (peers.value.find((p: PeerInfo) => p.id === peer.id)) {
        return
      }
      updatePeer(peer.id, {
        displayName: peer.displayName,
        hidden: peer.hidden,
        role: peer.role,
        audioTrack: peer.getStream(RtcMediaLabel.Mic),
        track: peer.getStream(RtcMediaLabel.Camera)
      })
      peer.on(RemotePeerEvents.NameChanged, ({ displayName }) => {
        updatePeer(peer.id, { displayName })
      })
      peer.on(RemotePeerEvents.Left, () => {
        logger.debug("peer left peerId:%s", peer.id)
        peers.value = peers.value.filter(({ id }: PeerInfo) => peer.id !== id)
      })
      peer.on(RemotePeerEvents.Stream, ({ label, track }) => {
        onPeerStreamAvailable({ label: label as RtcMediaLabel, peerId: peer.id, track });
      });
    })

    function onJoined() {
      logger.debug("joined")
      joined.value = true
      joining.value = false
    }

    function onProducingReady() {
      logger.debug("onProducingReady")
      if (videoTrack.value) {
        startCameraStream(videoTrack.value)
      }
      if (audioTrack.value) {
        startMicStream(audioTrack.value)
      }
    }

    function onPeerStreamAvailable({
      label,
      peerId,
      track
    }: Omit<RtcPeerStreamAvailableData, "resumed">) {
      logger.debug("onPeerStreamAvailable label:%s peerId:%s", label, peerId)
      const peer = peers.value.find((peer: PeerInfo) => peer.id === peerId)
      if (!peer) {
        return
      }
      switch (label as RtcMediaLabel) {
        case RtcMediaLabel.Camera:
          peer.track = track
          break
        case RtcMediaLabel.Mic:
          peer.audioTrack = track
          plugPeerAudio(peerId, track)
          break
      }
    }

    function onPeerStreamUnavailable({ label, peerId }: RtcPeerStreamUnavailableData) {
      logger.debug("onPeerStreamUnavailable label:%s peerId:%s", label, peerId)
      switch (label) {
        case RtcMediaLabel.Camera:
          hidePeerVideo(peerId)
          break
        case RtcMediaLabel.Mic:
          unplugPeerAudio(peerId)
          break
      }
    }

    function hidePeerVideo(peerId: string) {
      logger.debug("hidePeerVideo peerId:%s", peerId)
      updatePeer(peerId, { track: null })
    }

    function plugPeerAudio(peerId: string, track: MediaStreamTrack) {
      logger.debug("plugPeerAudio peerId:%s", peerId)
      updatePeer(peerId, { audioTrack: track })

      audioController.plug(peerId, track)
      audioController.start()
    }

    function unplugPeerAudio(peerId: string) {
      logger.debug("unplugPeerAudio peerId:%s", peerId)
      updatePeer(peerId, { audioTrack: null })
      audioController.unplug(peerId)
    }

    function updatePeer(peerId: string, props: Partial<PeerInfo>) {
      const peerIndex = peers.value.findIndex(({ id }: PeerInfo) => peerId === id)
      const rp = peerIndex >= 0 ? peers.value[peerIndex] : { id: peerId } as PeerInfo;
      const { displayName, hidden, role, track, audioTrack } = props
      if (displayName !== undefined) {
        rp.displayName = displayName
      }
      if (role !== undefined) {
        rp.role = role
      }
      if (hidden !== undefined) {
        rp.hidden = hidden
      }
      if (track !== undefined) {
        rp.track = track
      }
      if (audioTrack !== undefined) {
        rp.audioTrack = audioTrack
      }
      if (peerIndex >= 0) {
        peers.value.splice(peerIndex, 1, rp)
      } else {
        peers.value.push(rp)
      }
      return rp
    }

    return () => {
      logger.debug("disconnect")
      outgoingVideoStream.value?.close()
      outgoingVideoStream.value = undefined
      outgoingAudioStream.value?.close()
      outgoingAudioStream.value = undefined
      audioTrack.value = null
      videoTrack.value = null
      room!.leave()
      joined.value = false
      joining.value = false
      reset()
    }
  }

  function join() {
    if (!room) {
      return
    }
    if (joining.value) {
      return
    }
    room.me.setName(displayName.value)
    joining.value = true
    room.join()
  }

  function isValidParams({ roomId }: CallSessionParams): boolean {
    return !!roomId
  }

  function onConnectedToRoom(data: ConnectedPayload) {
    const {
      me: { role },
      room: { waitingRoom: wr }
    } = data
    moderator.value = role === "moderator"
    waitingRoom.value = wr
  }

  function onWaitingRoomSet(state: boolean) {
    waitingRoom.value = state
  }

  function reset() {
    audioController.unplugAll()
    peers.value = []
  }

  async function startCameraStream(track: MediaStreamTrack) {
    if (!room) {
      return
    }
    outgoingVideoStream.value = await room.rtc.sendStream(RtcMediaLabel.Camera, track)
    outgoingVideoStream.value.resume()
  }

  async function startMicStream(track: MediaStreamTrack) {
    if (!room) {
      return
    }
    outgoingAudioStream.value = await room.rtc.sendStream(RtcMediaLabel.Mic, track)
    outgoingAudioStream.value.resume()
  }

  function streamMedia(label: RtcMediaLabel) {
    const track = label === RtcMediaLabel.Camera ? videoTrack.value : audioTrack.value
    if (!track) {
      logger.debug("Media track not set, skipping label:%s", label)
      return
    }
    switch (label) {
      case RtcMediaLabel.Camera:
        streamCamera(track)
        break
      case RtcMediaLabel.Mic:
        streamMic(track)
        break
    }
  }

  function stopMediaStream(label: RtcMediaLabel) {
    switch (label) {
      case RtcMediaLabel.Camera:
        outgoingVideoStream.value?.pause()
        break
      case RtcMediaLabel.Mic:
        outgoingAudioStream.value?.pause()
        break
    }
  }

  function streamCamera(track: MediaStreamTrack) {
    videoTrack.value = track
    startCameraStream(track)
  }

  async function streamMic(track: MediaStreamTrack) {
    audioTrack.value = track
    startMicStream(track)
  }

  return {
    audioController,
    audioTrack,
    camera: readonly(outgoingVideoStream),
    connected: readonly(connected),
    displayName,
    joined: readonly(joined),
    joining: readonly(joining),
    mic: readonly(outgoingAudioStream),
    moderator: readonly(moderator),
    peers: readonly(peers),
    videoTrack,
    waitingRoom: readonly(waitingRoom),
    connect,
    join,
    stopMediaStream,
    stopStreaming: stopMediaStream,
    startStreaming: streamMedia,
    streamMedia
  }
}
