<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'

import { reportError } from '@gcorevideo/rtckit/lib/trace'

import { useMediaDevicesStore } from '../stores/mediaDevices'
import { useWebrtcProducer } from '@/composables/webrtcProducer'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'
import { usePlayerUrl } from '@/composables/playerUrl'
import PeerVideo from './PeerVideo.vue'
import PeerView from './PeerView.vue'

const props = defineProps<{
  host?: boolean
}>()

const mediaDevices =
  useMediaDevicesStore()
const producer = useWebrtcProducer()
const session = useSessionStore()
const settings = useSettingsStore()

const whipEndpoint = computed(() =>
  session.host
    ? settings.whipEndpoint
    : settings.whipEndpointGuest,
)

const auth = computed(() =>
  session.host
    ? settings.whipAuth
    : settings.whipAuthGuest,
)

const selfVideo =
  ref<HTMLVideoElement>()

const playerUrl = usePlayerUrl()

type CleanupFn = () => void
const cleanup: CleanupFn[] = []
const videoParams = computed<{
  width?: number
  height?: number
}>(() => {
  if (mediaDevices.videoTrack) {
    const s =
      mediaDevices.videoTrack.getSettings()
    return {
      width: s.width,
      height: s.height,
    }
  }
  return {
    width: undefined,
    height: undefined,
  }
})

onMounted(async () => {
  const roomId = session.roomId
  const peerId = session.peerId
  const mediaServer = new URL(whipEndpoint.value).host
  await producer.setup({
    auth: auth.value,
    endpoint: whipEndpoint.value,
    iceServers: settings.iceServers,
  })
  cleanup.push(() => producer.close())
  const tracks: MediaStreamTrack[] = []
  if (
    mediaDevices.microphoneEnabled &&
    mediaDevices.audioTrack
  ) {
    tracks.push(mediaDevices.audioTrack)
  }
  if (
    mediaDevices.cameraEnabled &&
    mediaDevices.videoTrack
  ) {
    tracks.push(mediaDevices.videoTrack)
  }
  await new Promise((resolve) => {
    setTimeout(resolve, 1000)
  })
  await producer.start(
    new MediaStream(tracks),
  )
  if (mediaDevices.videoTrack) {
    initSelfVideo(
      mediaDevices.videoTrack,
    )
  }
})

onUnmounted(() => {
  cleanup
    .splice(0, cleanup.length)
    .forEach((fn) => fn())
})

function initSelfVideo(
  track: MediaStreamTrack,
) {
  if (!selfVideo.value) {
    return
  }
  const stream = new MediaStream([
    track,
  ])
  selfVideo.value.srcObject = stream
  selfVideo.value.play().catch(e => {
    reportError(e)
  })
  selfVideo.value.onpause = () => {
    selfVideo.value?.play()
  }
}

function leave() {
  session.leave()
}

const whepEndpoint = computed(() =>
  props.host
    ? settings.whepEndpointGuest
    : settings.whepEndpoint,
)
const peerWhepAuth = computed(() =>
  props.host
    ? settings.whipAuthGuest
    : settings.whipAuth,
)
</script>

<template>
  <div class="room-session">
    <peer-video
      v-if="whepEndpoint"
      :endpoint="whepEndpoint"
      :auth="peerWhepAuth"
      :label="`Your ${host ? 'guest' : 'host'}`"
    />
    <peer-view v-else>
      <template #overlay>
        <span>
          Can't connect 1:1 with a
          {{
            host ? 'guest' : 'host'
          }}
          without the
          <router-link to="/settings"
            >{{
              host ? 'guest' : 'host'
            }}
            endpoint
            settings</router-link
          >
        </span>
      </template>
    </peer-view>
    <div class="self-video">
      <video
        ref="selfVideo"
        autoplay
        playsinline
      ></video>
      <span class="self-video__label"
        >You
        <small
          v-if="
            videoParams.width &&
            videoParams.height
          "
          >{{
            videoParams.width
          }}&times;{{
            videoParams.height
          }}</small
        ></span
      >
    </div>
    <div v-if="host && playerUrl">
      <router-link to="/player"
        >Watch it</router-link
      >
    </div>
    <button @click="leave">
      Leave
    </button>
  </div>
</template>

<style scoped>
.room-session {
  position: relative;
  min-width: 400px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
}
button {
  align-self: center;
  position: relative;
  top: 0.5rem;
}
.self-video {
  position: absolute;
  bottom: 0;
  right: -5px;
  width: 100px;
  height: 75px;
  background-color: rgba(0, 0, 0, 0.9);
  box-shadow: 0 0 2px 1px
    rgba(125, 125, 125, 0.5);
  z-index: 1;
}
.self-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.self-video__label {
  position: absolute;
  bottom: 0;
  left: 0;
  color: white;
  font-size: 0.75rem;
  padding: 0 2px;
  z-index: 1;
}
.self-video__label:hover {
  background-color: rgba(0, 0, 0, 0.5);
}
.peer-video {
  width: 100%;
  flex: 100% 1 1;
}
</style>
