<template>
  <div class="peer-view" :class="{ 'peer-view_self': peerId === 'self' }">
    <PersonIcon />
    <video ref="video" autoplay muted playsinline v-show="videoTrack" />
    <div class="peer-view__info">
      <div class="peer-view__icons" v-if="!videoTrack || !audioTrack">
        <CamOffIcon v-if="!videoTrack" :size="20" color="#880000" />
        <MicOffIcon v-if="!audioTrack" :size="20" color="#880000" />
      </div>
      <p class="peer-view__name">{{ displayName }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watchEffect } from "vue"
import { logger } from "@/components/peers/Logger"
import CamOffIcon from "@/components/icons/CamOffIcon.vue"
import MicOffIcon from "@/components/icons/MicOffIcon.vue"
import PersonIcon from "@/components/icons/PersonIcon.vue"

const props = defineProps<{
  peerId: string
  videoTrack: MediaStreamTrack | null
  audioTrack: MediaStreamTrack | null
  displayName: string
}>()

const video = ref<HTMLVideoElement | null>(null)

function playVideo(videoElem: HTMLVideoElement, track: MediaStreamTrack) {
  logger.debug("playVideo peerId:%s trackId:%s", props.peerId, track.id, videoElem)
  const stream = new MediaStream([track])
  videoElem.srcObject = stream
  videoElem.oncanplay = () => {
    logger.debug("canplay peerId:%s trackId:%s", props.peerId, track.id)
  }
  videoElem.play().catch((e) => {
    logger.error("playVideo play error", e)
  })
}

function stopVideo(videoElem: HTMLVideoElement) {
  logger.debug("stopVideo peerId:%s", props.peerId)
  videoElem.pause()
  videoElem.srcObject = null
}

onMounted(() => {
  watchEffect(() => {
    logger.debug("watchEffect")
    if (props.videoTrack) {
      playVideo(video.value!, props.videoTrack)
    } else {
      stopVideo(video.value!)
    }
  })
})
</script>

<style scoped lang="scss">
@import "../assets/main.scss";

.peer-view {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 25vw;
  min-width: 200px;
  max-width: 350px;
  aspect-ratio: 4/3;
  overflow: hidden;
  background-color: var(--rich-black);
  border: 1px solid silver;
  border-radius: 4px;
  position: relative;

  video {
    width: 100%;
    position: absolute;
  }

  &__info {
    position: absolute;
    left: 5px;
    bottom: 5px;
    background-color: var(--rich-black);
    color: var(--verdigris);
    border-radius: 5px;
    padding: 2px 6px;
    opacity: var(--l-opacity);
    display: flex;
    justify-content: flex-start;
    align-items: center;
    max-width: calc(100% - 10px);
    gap: 4px;
  }

  &__icons {
    display: flex;
    align-items: center;
  }

  &__name {
    overflow: hidden;
    text-overflow: ellipsis;
    text-wrap: nowrap;
  }
}
</style>
