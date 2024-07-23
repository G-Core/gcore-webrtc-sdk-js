<script setup lang="ts">
import {
  SignalIcon,
  SignalSlashIcon,
} from '@heroicons/vue/16/solid'

const mediaDevices = useMediaDevices()
const userMedia = useUserMedia()

type FrameSize = {
  width: number
  height: number
}

defineProps<{
  ended?: boolean
  live?: boolean
}>()

const frameSize = ref<FrameSize>({
  width: 0,
  height: 0,
})
const video =
  ref<HTMLVideoElement | null>(null)

watch(
  [() => userMedia.value.stream, video],
  ([s, v]) => {
    console.log(
      'camera-settings: watch',
      s,
      v,
    )
    if (!v) return
    if (s) {
      v.srcObject = s
      v.play().then(
        () => {
          console.log(
            'Video element now playing',
          )
        },
        (e) => {
          console.error(
            'Video element play',
            e,
          )
        },
      )
    } else {
      v.srcObject = null
    }
  },
)

watch(
  () => userMedia.value.videoTrack,
  (track) => {
    console.log(
      'camera-settings: watch videoTrack',
      track,
    )
    if (!track) return
    const { width = 0, height = 0 } =
      track.getSettings()
    frameSize.value = { width, height }
  },
)
</script>

<template>
  <div
    class="camera-preview max-w-2xl mb-4 flex flex-col justify-items-center justify-center items-center"
    v-if="mediaDevices.willUseCamera"
  >
    <video
      class="aspect-video w-full"
      ref="video"
      autoplay
      playsinline
      muted
    >
      Self preview
    </video>
    <div
      class="preview-label px-2 py-1 flex gap-1 items-center"
      :class="{ live }"
    >
    <signal-icon
      v-if="live"
      stroke="white"
      size="16"
      class="size-5 animate-pulse"
    />
    <signal-slash-icon
      stroke="white"
      size="16"
      class="size-5"
      v-else
    />
    <template v-if="ended">
      <span>Ended</span>
    </template>
    <template v-else>
      <span>You</span>
      <span
        v-if="
          frameSize.width &&
          frameSize.height
        "
        >({{
          frameSize.width
        }}&times;{{
          frameSize.height
        }})</span
      >
    </template>
      <slot>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.camera-preview {
  position: relative;
  text-align: center;
  background-color: #eee;
}
video {
  background-color: #000;
  color: #fff;
}
.preview-label {
  position: absolute;
  z-index: 1;
  background-color: rgba(0, 0, 0, 0.25);
  color: #fff;
}
.live {
  background-color: rgba(
    205,
    0,
    0,
    0.25
  );
}
</style>
