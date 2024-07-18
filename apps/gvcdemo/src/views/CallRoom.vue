<template>
  <section class="room">
    <div v-if="callEnded" class="room__end-call">Call ended</div>
    <template v-else>
      <div class="room__peers" :class="{ room__peers_joined: joined }" id="room-peers">
        <SelfPeerView
          :display-name="displayName"
          :video-track="videoTrack"
          :audio-track="audioTrack"
          :joined="joined"
        />
        <PeerView
          v-for="peer of peers"
          :id="`peer-${peer.id}`"
          :key="peer.id"
          :display-name="peer.displayName"
          :peer-id="peer.id"
          :video-track="peer.track"
          :audio-track="peer.audioTrack"
        />
      </div>
      <input
        class="room__name-input"
        type="text"
        placeholder="Enter User Name"
        v-model="displayName"
        v-if="!joined"
      />
    </template>
    <div class="room__buttons">
      <ControlPanel
        @toggle-camera="toggleCamera"
        @toggle-mic="toggleMic"
        :has-video="!!videoTrack"
        :has-audio="!!audioTrack"
        v-if="!callEnded"
      />
      <template v-if="isLeavePanelHidden && !callEnded">
        <ConnectBtn
          @join="joinRoom"
          @leave="hideLeavePanel(false)"
          :ask="needJoinApproval"
          :connected="connected"
          :haveName="!!displayName"
          :joined="joined"
          v-if="!(needJoinApproval && joining)"
        />
        <span class="waiting-room" v-else> Waiting for the moderator to let you in... </span>
      </template>
      <LeavePanel
        v-if="callEnded || !isLeavePanelHidden"
        @leave="leave"
        @create="createNewRoom"
        @cancel="hideLeavePanel(true)"
        :no-leave="callEnded"
        :no-cancel="callEnded"
      />
    </div>
    <audio ref="audioElem" :controls="false" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from "vue"
import { useRoute, useRouter } from "vue-router"

import PeerView from "@/components/PeerView.vue"
import SelfPeerView from "@/components/SelfPeerView.vue"
import ControlPanel from "@/components/ControlPanel.vue"
import ConnectBtn from "@/components/ConnectBtn.vue"
import LeavePanel from "@/components/LeavePanel.vue"

import { useCallRoom } from "@/composables/useCallRoom"
import { RtcMediaLabel } from "@gcorevideo/rtckit"

type PeerInfo = {
  id: string
  track: MediaStreamTrack | null
  audioTrack: MediaStreamTrack | null
  displayName: string
  hidden: boolean
  role: string
  domain: string
}

const config = {
  clientHost: "internal.gvideo.co"
}

const {
  audioController,
  audioTrack,
  connected,
  joined,
  joining,
  displayName,
  moderator,
  peers,
  videoTrack,
  waitingRoom,
  connect,
  join,
  startStreaming,
  stopStreaming
} = useCallRoom(config)

const mediaStream = ref<MediaStream | null>()
const audioElem = ref<HTMLAudioElement>()
const callEnded = ref(false)
const disconnect = ref<() => void>()
// const moderator = ref<boolean>(false)
// const waitingRoom = ref<boolean>(false)
const needJoinApproval = computed(() => !moderator.value && waitingRoom.value)
const route = useRoute()
const router = useRouter()
const roomId = ref("")
const peerId = ref("")
// const outgoingVideoStream = ref<RtcOutgoingStreamT | null>()
// const outgoingAudioStream = ref<RtcOutgoingStreamT | null>()
// const toggleCamera = ref<() => void>(() => {})
// const toggleMic = ref<() => void>(() => {})
// const joinRoom = ref<() => void>(() => {})
const isLeavePanelHidden = ref(true)
// const audioTrack = ref<MediaStreamTrack | null>(null)
// const videoTrack = ref<MediaStreamTrack | null>(null)
// const peers = ref<PeerInfo[]>([])
// const displayName = ref("")
// const joined = ref(false)
// const joining = ref(false)
// const connected = ref(false)
// const loopback = ref(false)

function hideLeavePanel(state: boolean) {
  isLeavePanelHidden.value = state
}

function createNewRoom() {
  leave()
  router.push("/")
}

function leave() {
  callEnded.value = true
  hideLeavePanel(true)
  if (disconnect.value) {
    disconnect.value()
    disconnect.value = undefined
  }
}

async function requestMedia() {
  closeMedia()
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  })
  mediaStream.value = stream
  stream.getTracks().forEach((t) => {
    if (t.kind === "audio") {
      audioTrack.value = t
      startStreaming(RtcMediaLabel.Mic)
      t.addEventListener("ended", () => {
        stopStreaming(RtcMediaLabel.Mic)
      })
    } else {
      videoTrack.value = t
      startStreaming(RtcMediaLabel.Camera)
      t.addEventListener("ended", () => {
        stopStreaming(RtcMediaLabel.Camera)
      })
    }
  })
}

function closeMedia() {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach((t) => t.stop())
    mediaStream.value = null
    videoTrack.value = null
    audioTrack.value = null
  }
}

// async function connect(params: CallSessionParams) {
//   if (!isValidParams(params)) {
//     logger.error("connect invalid params")
//     return
//   }

//   const { token, server } = await api.initSession(params)

//   const conn = new SocketConnection(server, token)
//   const rtcClient = useRtcClient(conn)
//   const room = new RoomClient(rtcClient, conn)

//   disconnect.value = () => {
//     logger.debug("disconnect")
//     hideLeavePanel(true)
//     rtcClient.close()
//     joined.value = false
//     conn.close()
//     reset()
//   }

//   conn.on(SignalConnectionEvents.Connect, () => {
//     logger.debug("connected to room")
//     connected.value = true
//     joinRoom.value = () => {
//       logger.debug("joining the room")
//       room.setName(displayName.value)
//       joining.value = true
//       room.join()
//     }
//     toggleCamera.value = () => {
//       if (outgoingVideoStream.value && mediaStream.value) {
//         if (outgoingVideoStream.value?.paused) {
//           outgoingVideoStream.value.resume()
//           mediaStream.value.getTracks().forEach((t) => {
//             if (t.kind === "video") {
//               videoTrack.value = t
//             }
//           })
//         } else {
//           outgoingVideoStream.value.pause()
//           videoTrack.value = null
//         }
//       }
//     }
//     toggleMic.value = () => {
//       if (outgoingAudioStream.value && mediaStream.value) {
//         if (outgoingAudioStream.value?.paused) {
//           outgoingAudioStream.value.resume()
//           mediaStream.value.getTracks().forEach((t) => {
//             if (t.kind === "audio") {
//               audioTrack.value = t
//             }
//           })
//         } else {
//           outgoingAudioStream.value.pause()
//           audioTrack.value = null
//         }
//       }
//     }
//   })
//   room.on(RoomClientEvents.Connected, onConnectedToRoom)
//   room.on(RoomClientEvents.Joined, onJoined)
//   room.on(RoomClientEvents.PeerNameChanged, onPeerDisplayNameChanged)
//   room.on(RoomClientEvents.WaitingRoomState, onWaitingRoomSet)

//   conn.on("disconnect", () => {
//     logger.debug("disconnected")
//     connected.value = false
//     reset()
//   })
//   function onJoined() {
//     logger.debug("joined")
//     joined.value = true
//   }

//   room.on(RoomClientEvents.NewPeer, (peerInfo: PeerPublicInfo) => {
//     const {
//       id,
//       displayName,
//       hidden,
//       role,
//       appData: { domain }
//     } = peerInfo
//     updatePeer(id, { displayName, hidden, role, domain: domain as string })
//   })
//   room.on(RoomClientEvents.PeerLeft, (peerId: string) => {
//     logger.debug("peer left peerId:%s", peerId)
//     peers.value = peers.value.filter((peer) => peer.id !== peerId)
//   })
//   rtcClient.on(RtcClientEvents.ProducingReady, onProducingReady)
//   rtcClient.on(RtcClientEvents.PeerStreamAvailable, onPeerStreamAvailable)
//   rtcClient.on(RtcClientEvents.PeerStreamUnavailable, onPeerStreamUnavailable)

//   function onProducingReady() {
//     logger.debug("onProducingReady")
//     if (videoTrack.value) {
//       runCameraCheck(videoTrack.value)
//     }
//     if (audioTrack.value) {
//       runMicCheck(audioTrack.value)
//     }
//     requestTestStream()
//   }

//   async function runCameraCheck(track: MediaStreamTrack) {
//     logger.debug("runCameraCheck")
//     outgoingVideoStream.value = await rtcClient.sendStream(RtcMediaLabel.Camera, track)
//     outgoingVideoStream.value.resume()
//     if (loopback.value) {
//       logger.debug("runCameraCheck request loopback")
//       outgoingVideoStream.value.requestLoopback()
//     }
//   }

//   async function runMicCheck(track: MediaStreamTrack) {
//     logger.debug("runCameraCheck")
//     outgoingAudioStream.value = await rtcClient.sendStream(RtcMediaLabel.Mic, track)
//     outgoingAudioStream.value.resume()
//     if (loopback.value) {
//       logger.debug("runMicCheck request loopback")
//       outgoingAudioStream.value.requestLoopback()
//     }
//   }

//   async function requestTestStream() {
//     rtcClient.requestTestStream(RtcMediaLabel.Camera)
//     rtcClient.requestTestStream(RtcMediaLabel.Mic)
//   }

//   function onPeerStreamAvailable({ label, peerId, track }: RtcPeerStreamAvailableData) {
//     logger.debug("onPeerStreamAvailable label:%s peerId:%s", label, peerId)
//     if (peers.value.find((peer) => peer.id === peerId)) {
//       switch (label) {
//         case RtcMediaLabel.Camera:
//           showPeerVideo(peerId, track)
//           break
//         case RtcMediaLabel.Mic:
//           plugPeerAudio(peerId, track)
//           break
//       }
//     }
//   }

//   function onPeerStreamUnavailable({ label, peerId }: RtcPeerStreamUnavailableData) {
//     logger.debug("onPeerStreamUnavailable label:%s peerId:%s", label, peerId)
//     switch (label) {
//       case RtcMediaLabel.Camera:
//         hidePeerVideo(peerId)
//         break
//       case RtcMediaLabel.Mic:
//         unplugPeerAudio(peerId)
//         break
//     }
//   }

//   function showPeerVideo(peerId: string, track: MediaStreamTrack) {
//     logger.debug("showPeerVideo peerId:%s", peerId, track)
//     updatePeer(peerId, { track })
//   }

//   function hidePeerVideo(peerId: string) {
//     logger.debug("hudePeerVideo peerId:%s", peerId)
//     updatePeer(peerId, { track: null })
//   }

//   function plugPeerAudio(peerId: string, track: MediaStreamTrack) {
//     logger.debug("plugPeerAudio peerId:%s", peerId)
//     updatePeer(peerId, { audioTrack: track })

//     audioController.plug(peerId, track)
//     audioController.start()
//   }

//   function unplugPeerAudio(peerId: string) {
//     logger.debug("unplugPeerAudio peerId:%s", peerId)
//     updatePeer(peerId, { audioTrack: null })
//     audioController.unplug(peerId)
//   }

//   function updatePeer(peerId: string, props: Partial<PeerInfo>) {
//     logger.debug("updatePeer peerId:%s %o", peerId, props)
//     const peerIndex = peers.value.findIndex(({ id }) => peerId === id)
//     const rp = peerIndex >= 0 ? peers.value[peerIndex] : new RemotePeer(peerId)
//     const { displayName, hidden, role, domain, track, audioTrack } = props
//     if (displayName !== undefined) {
//       rp.displayName = displayName
//     }
//     if (role !== undefined) {
//       rp.role = role
//     }
//     if (hidden !== undefined) {
//       rp.hidden = hidden
//     }
//     if (domain !== undefined) {
//       rp.domain = domain
//     }
//     if (track !== undefined) {
//       rp.track = track
//     }
//     if (audioTrack !== undefined) {
//       rp.audioTrack = audioTrack
//     }
//     if (peerIndex >= 0) {
//       peers.value.splice(peerIndex, 1, rp)
//     } else {
//       peers.value.push(rp)
//     }
//   }

//   function onPeerDisplayNameChanged({
//     peerId,
//     displayName
//   }: {
//     peerId: string
//     displayName: string
//   }) {
//     updatePeer(peerId, { displayName })
//   }
// }

// function isValidParams({ roomId, peerId }: CallSessionParams): boolean {
//   return !!(peerId && roomId)
// }

// function onConnectedToRoom(data: ConnectedPayload) {
//   const {
//     me: { id, role },
//     room: { waitingRoom: wr }
//   } = data
//   peerId.value = id
//   moderator.value = role === PeerRole.Moderator
//   waitingRoom.value = wr
// }

// function onWaitingRoomSet(state: boolean) {
//   waitingRoom.value = state
// }

// function reset() {
//   audioController.unplugAll()
//   peers.value = []
//   connect({
//     peerId: peerId.value,
//     roomId: roomId.value
//   })
// }

onMounted(async () => {
  displayName.value = "Tommy Hilfiger"
  if (navigator && navigator.mediaDevices) {
    try {
      await requestMedia()
    } catch (error: any) {
      console.error(error.message)
      alert("Access to input devices (camera/microphone) is closed")
    }
  }
  roomId.value = Array.isArray(route.params.roomId) ? route.params.roomId[0] : route.params.roomId
  const url = new URL(location.href)
  const peerId = url.searchParams.get("peerId") || self.crypto.randomUUID()

  disconnect.value = await connect({
    peerId,
    roomId: roomId.value
  })
  audioController.initialize()
})

watchEffect(() => {
  if (audioElem.value) {
    audioController.attachOutput(audioElem.value)
  }
})

onUnmounted(() => {
  if (disconnect.value) {
    disconnect.value()
  }
  closeMedia()
})

function joinRoom() {
  join()
  audioController.start()
}

function toggleDevice(kind: "audio" | "video") {
  const trackRef = kind === "video" ? videoTrack : audioTrack
  const label = kind === "video" ? RtcMediaLabel.Camera : RtcMediaLabel.Mic
  if (trackRef.value) {
    trackRef.value.enabled = false
    trackRef.value = null
    stopStreaming(label)
  } else {
    const track = mediaStream.value?.getTracks().find((t) => t.kind === kind)
    if (track) {
      track.enabled = true
      trackRef.value = track
      startStreaming(label)
    }
  }
}

function toggleCamera() {
  toggleDevice("video")
}
function toggleMic() {
  toggleDevice("audio")
}
</script>

<style scoped lang="scss">
.room {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;

  &__peers {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 20px;
    width: 100%;

    &_joined {
      padding-bottom: 160px;
    }
  }

  &__name-input {
    margin-bottom: 20px;
    padding: 0 10px;
    border: 1px solid;
    background: none;
    font-family: inherit;
    font-size: inherit;
    color: var(--text);
    height: 36px;
    text-overflow: ellipsis;

    &:focus {
      outline: none;
    }
  }

  &__buttons {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 20px 60px;
    position: fixed;
    bottom: 0;
    border: 2px solid var(--text);
    border-bottom: none;
    background-color: var(--bg);
    opacity: var(--l-opacity);
  }

  &__end-call {
    padding: 5px 20px;
    font-size: 20px;
  }
}
</style>
