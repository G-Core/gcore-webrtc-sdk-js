<template>
  <select
    @change="$e => value = ($e.target as HTMLSelectElement).value "
  >
    <option
      v-for="item of mediaDevices.videores"
      :key="item.height"
      :value="item.height"
      :selected="item === value"
    >
      {{ item.width }}×{{ item.height }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { useMediaDevicesStore } from '@/stores/mediaDevices';

const mediaDevices = useMediaDevicesStore()
const value = defineModel()

</script>
