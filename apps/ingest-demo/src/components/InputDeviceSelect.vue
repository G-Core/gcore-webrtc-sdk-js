<script setup lang="ts">
import { computed } from 'vue'

defineEmits<{
  change: [string]
  toggle: [boolean]
}>()
const props = defineProps<{
  checked: boolean
  deviceId: string
  devicesList: Readonly<
    MediaDeviceInfo[]
  >
  disabled?: boolean
  label: string
}>()

const deviceNo = computed(() => {
  return Object.fromEntries(
    props.devicesList.map((device, i) => [
      device.deviceId,
      i + 1,
    ]),
  )
})
</script>

<template>
  <input
    type="checkbox"
    @change="$emit('toggle', !checked)"
    :disabled="disabled"
  />
  <select
    @change="(e) => $emit('change', (e.target as HTMLSelectElement).value)"
    :disabled="disabled"
  >
    <option
      v-for="device of devicesList"
      :key="device.deviceId"
      :value="device.deviceId"
      :selected="
        device.deviceId === deviceId
      "
    >
      {{ device.label || `${props.label} ${deviceNo[device.deviceId]}` }}
    </option>
  </select>
</template>
