<script setup lang="ts">
import { WhipClient } from '@gcorevideo/rtckit/lib/whip'

definePageMeta({
  middleware: 'auth',
})

const iceServers = useIceServers()

const mediaDevices = useMediaDevices()
const stream = await useStream()

let whipClient: WhipClient | null = null

const air = useAir()

const userMedia = useUserMedia()
const canStart = computed(
  () =>
    userMedia.value.videoTrack &&
    userMedia.value.audioTrack &&
    !started.value,
)
const started = computed(() => air.value.live || air.value.ended)

function start() {
  const s = userMedia.value.stream
  if (!s) {
    return
  }
  air.value.live = true
  if (!whipClient) {
    whipClient = new WhipClient(
      stream.whipEndpoint,
      {
        videoCodecs: ['H264'],
        iceServers: iceServers.value,
      },
    )
    whipClient.start(s)
  }
}

function leave() {
  air.value.live = false
  air.value.ended = true
  if (whipClient) {
    whipClient.close()
    whipClient = null
  }
  if (userMedia.value.stream) {
    closeMediaStream(
      userMedia.value.stream,
    )
    userMedia.value.stream = null
  }
}

function restart() {
  window.location.reload()
}
</script>

<template>
  <div>
    <nuxt-layout>
      <template #header>
        Cool, you're hosting
      </template>
      <div class="block my-2">
        <camera-control />
        <camera-preview
          v-if="
            mediaDevices.willUseCamera
          "
          :live="air.live"
          :ended="air.ended"
        >
          <a @click.prevent="restart" href="#" v-if="air.ended">reload</a>
        </camera-preview>
        <mic-control />
      </div>
      <div class="block my-2 flex gap-2 items-center">
        <button
          @click="start"
          v-if="canStart"
          class="px-4 py-1 btn"
        >
          Start
        </button>
        <div class="py-2 text-slate-600 text-center md:text-left" v-if="!started && !canStart">
          Turn on your camera <b>and</b> microphone before you start streaming
        </div>
        <button
          @click="leave"
          v-if="air.live"
          class="px-4 py-1 btn"
        >
          Leave
        </button>
        <a v-if="air.live" :href="stream.playerUrl" target="_blank">watch</a>
      </div>
    </nuxt-layout>
  </div>
</template>

<style scoped>
@tailwind components;

@layer components {
  .statusRunning {
    @apply text-red-900;
  }
}

.btn {
  background-color: #000;
  border-radius: 3px;
  background-image: url('/img/slick-bg.svg');
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  color: #fff;
  text-transform: uppercase;
  font-weight: bold;
}
</style>
