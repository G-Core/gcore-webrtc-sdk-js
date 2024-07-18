<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
  watch,
} from 'vue'

import { useSessionStore } from '../stores/session'
import { useMediaDevicesStore } from '../stores/mediaDevices'

import ControlBlock from './ControlBlock.vue'
import CameraSelect from './CameraSelect.vue'
import MicrophoneSelect from './MicrophoneSelect.vue'
import VideoQualitySelect from './VideoQualitySelect.vue'

const emit = defineEmits<{
  joined: []
}>()

const props = defineProps<{
  host?: boolean
}>()

const session = useSessionStore()

const mediaDevices =
  useMediaDevicesStore()

const anyDeviceOn = computed(
  () =>
    (mediaDevices.microphoneEnabled &&
      mediaDevices.audioTrack) ||
    (mediaDevices.cameraEnabled &&
      mediaDevices.videoTrack),
)

const canJoin = computed(
  () =>
    !session.pending &&
    !mediaDevices.pending &&
    anyDeviceOn.value,
)

const videoQuality = ref<string>(
  props.host ? '1080p' : '480p',
)

watch(videoQuality, (newVal) => {
  mediaDevices.setVideoQuality(newVal)
}, {
  immediate: true,
})

onMounted(() => {
  mediaDevices.updateDevices()
})
</script>

<template>
  <div class="room-intro">
    <ControlBlock>
      <template #caption
        >Camera</template
      >
      <CameraSelect
        :disabled="mediaDevices.pending"
      />
      <VideoQualitySelect
        v-model="videoQuality"
        :disabled="mediaDevices.pending"
      />
    </ControlBlock>
    <ControlBlock>
      <template #caption
        >Microphone</template
      >
      <MicrophoneSelect
        :disabled="mediaDevices.pending"
      />
    </ControlBlock>
    <ControlBlock>
      <button
        @click="session.join(!!host)"
        :disabled="
          session.joined || !canJoin
        "
      >
        Join
      </button>
      <span v-if="session.joinning"
        >joining...</span
      >
      <span v-if="!anyDeviceOn"
        >turn on your camera and/or
        microphone</span
      >
    </ControlBlock>
  </div>
</template>

<style>
.room-intro {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
