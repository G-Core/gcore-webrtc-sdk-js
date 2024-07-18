<template>
  <select
    @change="$e => value = ($e.target as HTMLSelectElement).value "
  >
    <option
      v-for="item of ITEMS"
      :key="item"
      :value="item"
      :selected="item === value"
    >
      {{ item }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const value = defineModel()

const ITEMS = ['480p', '720p', '1080p']
</script>
