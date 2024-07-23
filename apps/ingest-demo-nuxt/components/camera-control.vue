<script setup lang="ts">
import useMediaDevices from '~/composables/use-media-devices'
import useUserMedia from '~/composables/use-user-media'

// const props = defineProps<{
//   live: boolean
// }>()

const air = useAir()

const mediaDevices = useMediaDevices()
const userMedia = useUserMedia()

function onChange(id: string) {
  mediaDevices.value.cameraDeviceId = id
  mediaDevices.value.willUseCamera =
    true
}

function onToggle() {
  if (air.value.live) {
    userMedia.value.cameraEnabled =
      !userMedia.value.cameraEnabled
  } else {
    mediaDevices.value.willUseCamera =
      !mediaDevices.value.willUseCamera
  }
}
</script>

<template>
  <device-settings
    :checked="
      mediaDevices.willUseCamera
    "
    :device-id="
      mediaDevices.cameraDeviceId
    "
    :devices-list="
      mediaDevices.cameraDevicesList
    "
    :disabled="air.ended"
    :readonly="air.live"
    label="Camera"
    @change="onChange"
    @toggle="onToggle"
  />
</template>
