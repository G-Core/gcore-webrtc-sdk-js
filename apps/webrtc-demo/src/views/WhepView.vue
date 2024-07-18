<script setup lang="ts">
import { computed, ref } from "vue";

import { useStore } from "../store";

import WhepPanel from "../components/WhepPanel.vue";

const endpoint = ref('')
const auth = ref('')
const video = ref(true)
const audio = ref(false)
const running = ref(false)

const { store } = useStore();
const hasGeneratedEndpoint = computed(() => !!store.playbackUrl);

function join() {
  running.value = true
}

function leave() {
  running.value = false
}

function useGeneratedEndpoint() {
  endpoint.value = store.playbackUrl
  auth.value = store.playbackAuth
}

</script>

<template>
  <main>
    <div class="setup block">
      <span class="label block__label">
        <label for="endpoint" title="Playback URL">Channel</label>
      </span>
      <input id="endpoint" v-model="endpoint" :disabled="running" placeholder="Playback URL"/>
    </div>
    <div class="setup block">
      <span class="label block__label">
        <label for="auth">Auth</label>
      </span>
      <div class="block__item">
        <input id="auth" v-model="auth" :disabled="running" />
        <button @click="useGeneratedEndpoint" :disabled="!hasGeneratedEndpoint || running">Generated</button>
      </div>
    </div>
    <div class="setup block">
      <span class="label">Playback</span>
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
      <span class="label filler"></span>
      <button @click="join" :disabled="running || !endpoint">Join</button>
      <button @click="leave" v-if="running">Leave</button>
    </div>
    <WhepPanel v-if="running" :endpoint="endpoint" :auth="auth" :video="video" :audio="audio" @close="leave" />
  </main>
</template>
