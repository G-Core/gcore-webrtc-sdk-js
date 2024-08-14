<template>
  <peer-view>
    <video
      ref="video"
      autoplay
      playsinline
      muted
      class=""
    ></video>
    <template #overlay>
      <span
        v-if="noMedia"
        class="no-media"
      >
        No active stream
      </span>
      <span class="label" v-if="label">
        {{ label }}
      </span>
    </template>
  </peer-view>
</template>

<script setup lang="ts">
import {
  nextTick,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'

import { useWebrtcConsumer } from '@/composables/webrtcConsumer'
import { useSettingsStore } from '@/stores/settings'
import PeerView from './PeerView.vue'

const props = defineProps<{
  endpoint: string
  auth?: string
  label?: string
}>()

const settings = useSettingsStore()
const { play, setup, stop } =
  useWebrtcConsumer()

const noMedia = ref(true)

const video = ref<HTMLVideoElement>()

let timerId: number | null = null

async function initPlayer(
  videoElem: HTMLVideoElement,
) {
  console.log("PeerVideo initPlayer")

  await setup(videoElem, {
    iceServers: settings.iceServers,
  })
  videoElem.onpause = () =>
    videoElem.play()
  videoElem.oncanplay = () =>
    videoElem.play()
}

async function tryConsume() {
  await play(props.endpoint, props.auth)
}

onMounted(() => {
  console.log("PeerVideo onMounted")
  nextTick(async () => {
    const v: HTMLVideoElement =
      video.value!
    try {
      await initPlayer(v)
      await tryConsume()
      v.oncanplay = () => {
        noMedia.value = false
      }
      v.onplaying = () => {
        noMedia.value = false
      }
      v.onpause = () => {
        noMedia.value = true
      }
    } catch (err) {
      console.error(
        'Failed to init player',
        err,
      )
    }
  })
})

onUnmounted(async () => {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
  console.log("PeerVideo onUnmounted")
  await stop()
})
</script>

<style scoped>
video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.label {
  position: absolute;
  bottom: 0;
  left: 0;
  padding: 2px 8px;
}
</style>
