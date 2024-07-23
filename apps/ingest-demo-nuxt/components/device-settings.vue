h<script setup lang="ts">
import { computed } from 'vue'

defineEmits<{
  change: [string]
  toggle: [boolean]
}>()
const props = defineProps<{
  checked: boolean
  deviceId: string
  devicesList: Readonly<
    { label: string; deviceId: string}[]
  >
  disabled?: boolean
  readonly?: boolean
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
  <div class="flex gap-1 mb-1 flex-wrap">
    <label>
      <input
        type="checkbox"
        @change="$emit('toggle', !checked)"
        :disabled="disabled"
      />
      {{ label.substring(0, 1).toUpperCase() + label.substring(1) }}
    </label>
    <select
      @change="(e) => $emit('change', (e.target as HTMLSelectElement).value)"
      :disabled="disabled || !checked || readonly"
    >
      <option v-if="!devicesList.length" disabled selected>No {{ label }}</option>
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
  </div>
</template>
