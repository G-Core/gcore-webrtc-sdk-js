<template>
  <main>
    <iframe :src="playerUrl" ref="iframe" v-if="playerUrl">
      Gcore Web Player
    </iframe>
    <button @click="reload">Reload</button>
    <a :href="playerUrl" v-if="playerUrl" target="_blank" rel="noopener noreferrer">
      Open in new tab
    </a>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { usePlayerUrl } from "@/composables/playerUrl"

const iframe = ref<HTMLIFrameElement | null>(null)

const playerUrl = usePlayerUrl()
function reload() {
  if (iframe.value) {
    iframe.value.src = ""
    iframe.value.src = playerUrl.value
  }

}
</script>

<style scoped>
iframe {
  width: 100%;
  height: 100%;
  border: none;
  background-color: black;
  min-height: 50vh;
}
</style>