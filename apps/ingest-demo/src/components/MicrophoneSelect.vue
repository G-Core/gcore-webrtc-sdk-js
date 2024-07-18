<script setup lang="ts">
import { useMediaDevicesStore } from '../stores/mediaDevices'

import InputDeviceSelect from './InputDeviceSelect.vue'

const mediaDevices =
  useMediaDevicesStore()
</script>

<template>
  <InputDeviceSelect
    :checked="
      mediaDevices.microphoneEnabled
    "
    :device-id="
      mediaDevices.micDeviceId
    "
    :devices-list="
      mediaDevices.microphoneDevices
    "
    label="Microphone"
    @change="
      mediaDevices.selectMicrophone
    "
    @toggle="
      mediaDevices.toggleMicrophone
    "
  />
</template>
