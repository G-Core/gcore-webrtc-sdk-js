<script setup lang="ts">
import { computed, ref } from "vue";

import { useStore } from "../store";

import WhipPanel from "../components/WhipPanel.vue";

const { store } = useStore();
const hasGeneratedEndpoint = computed(() => !!store.broadcastUrl);

const endpoint = ref('')
const auth = ref('')
const video = ref(true)
const audio = ref(false)
const running = ref(false)
const canTrickleIce = ref(false)
const canRestartIce = ref(false)

function start() {
  running.value = true
}

function stop() {
  running.value = false
}

function useGeneratedEndpoint() {
  // endpoin
  endpoint.value = store.broadcastUrl
  auth.value = store.broadcastAuth
}

</script>

<template>
  <main>
    <div class="setup block">
      <span class="label">
        <label for="endpoint" title="Broadcast URL">Channel</label>
      </span>
      <div class="block__item">
        <input id="endpoint" v-model="endpoint" :disabled="running" placeholder="Broadcast URL"/>
      </div>
    </div>
    <div class="setup block">
      <span class="label">
        <label for="auth">Auth</label>
      </span>
      <div class="block__item">
        <input id="auth" v-model="auth" :disabled="running" />
        <button @click="useGeneratedEndpoint" :disabled="!hasGeneratedEndpoint || running">Generated</button>
      </div>
    </div>
    <div class="setup block">
      <span class="label">Media source</span>
      <label for="video">
        <input id="video" type="checkbox" v-model="video" :disabled="running"/>
        Video
      </label>
      <label for="audio">
        <input id="audio" type="checkbox" v-model="audio" :disabled="running"/>
        Audio
      </label>
    </div>
    <div class="setup block">
      <span class="label">ICE</span>
      <label for="canTrickleIce">
        <input id="canTrickleIce" type="checkbox" v-model="canTrickleIce" :disabled="running"/>
        Can trickle ICE
      </label>
      <label for="canRestartIce">
        <input id="canRestartIce" type="checkbox" v-model="canRestartIce" :disabled="running"/>
        Can restart ICE
      </label>
    </div>
    <div class="setup block">
      <span class="label filler"></span>
      <button @click="start" :disabled="running || !endpoint">Start</button>
      <button @click="stop" v-if="running">Stop</button>
    </div>
    <WhipPanel v-if="running"
      :endpoint="endpoint" :auth="auth" :video="video" :audio="audio"
      :can-restart-ice="canRestartIce"
      :can-trickle-ice="canTrickleIce"
      @close="stop"
    />
  </main>
</template>

<style>
</style>