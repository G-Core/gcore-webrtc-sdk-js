<script setup lang="ts">
import { useMediaDevicesStore } from "../stores/mediaDevices"

import InputDeviceSelect from "./InputDeviceSelect.vue";

const mediaDevices = useMediaDevicesStore()
</script>

<template>
  <InputDeviceSelect
    :checked="mediaDevices.cameraEnabled"
    :device-id="mediaDevices.cameraDeviceId"
    :devices-list="mediaDevices.cameraDevices"
    label="Camera"
    @change="mediaDevices.selectCamera"
    @toggle="mediaDevices.toggleCamera"
  />
</template>
