<script setup lang="ts">
import useMediaDevices from '~/composables/use-media-devices'
import useUserMedia from '~/composables/use-user-media'

const mediaDevices = useMediaDevices()

const userMedia = useUserMedia()

const air = useAir()

function onChange(id: string) {
  mediaDevices.value.micDeviceId = id
  mediaDevices.value.willUseMic = true
}

function onToggle() {
  if (air.value.live) {
    userMedia.value.micEnabled =
      !userMedia.value.micEnabled
  } else {
    mediaDevices.value.willUseMic =
      !mediaDevices.value.willUseMic
  }
}
</script>

<template>
  <device-settings
    :checked="mediaDevices.willUseMic"
    :device-id="
      mediaDevices.micDeviceId
    "
    :devices-list="
      mediaDevices.micDevicesList
    "
    :disabled="air.ended"
    label="Microphone"
    :readonly="air.live"
    @change="onChange"
    @toggle="onToggle"
  />
</template>
