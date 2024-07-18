<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";

import { useStore } from "../store";

const API_URL = 'https://api.gcore.com/streaming/videocalls/broadcasts';

const { store } = useStore();

const apiKey = ref(localStorage.getItem('apiKey') || '')
// TODO validate API key: no "APIKey" prefix

const publicId = ref(randomBroadcastCode())
const pending = ref(false)
const error = ref('')

const exampleCurl = computed(() => {
  if (!publicId.value || !apiKey.value) {
    return ''
  }
  return `curl -X POST \\
  -H 'Authorization: APIKey ${apiKey.value}' \\
  -H 'Content-Type: application/json' \\
  https://api.gcore.com/streaming/videocalls/broadcasts \\
  -d '{"publicId": "${escape(publicId.value)}"}'`;
})

watchEffect(() => {
  localStorage.setItem('apiKey', apiKey.value)
})

const createBroadcast = () => {
  pending.value = true
  error.value = ''
  fetch(API_URL, {
    method: 'POST',
    headers: {
      authorization: `APIKey ${apiKey.value}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      publicId: publicId.value,
    }),
  }).then(r => {
    if (!r.ok) {
      return Promise.reject(new Error(`API request failed: HTTP ${r.status} ${r.statusText}`))
    }
    return r.json()
  }).then(data => {
    store.broadcastUrl = data.broadcastUrl
    store.playbackUrl = data.playbackUrl
    store.broadcastAuth = 'broadcastAuth' in data ? data.broadcastAuth : ''
    store.playbackAuth = 'playerAuth' in data ? data.playbackAuth : ''
  }).catch(e => {
    error.value = String(e)
  }).finally(() => {
    pending.value = false
  })
}

function deleteBroadcast() {
  error.value = ''
  pending.value = true
  fetch(store.broadcastUrl, {
    method: 'DELETE',
    headers: {
      authorization: `APIKey ${apiKey.value}`,
    },
  }).then(r => {
    if (!r.ok) {
      return Promise.reject(new Error(`API request failed: HTTP ${r.status} ${r.statusText}`))
    }
    store.broadcastUrl = ''
    store.playbackUrl = ''
    store.broadcastAuth = ''
    store.playbackAuth = ''
  }).catch(e => {
    error.value = String(e)
  }).finally(() => {
    pending.value = false
  })
}

function escape(code: string): string {
  return code.replace(/"'\\/g, '')
}

function randomBroadcastCode() {
  return 'air' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 1000));
}
</script>

<template>
  <section>
    <div class="block">
      <span class="block__label">
        <label for="apiKey">API Key 
          <a href="https://gcore.com/docs/account-settings/create-use-or-delete-a-permanent-api-token"
            title="How to get an API token" target="_blank" class="qm">?</a>
        </label>
      </span>
      <textarea id="apiKey" v-model="apiKey" />
    </div>
    <div class="block">
      <span class="label block__label">Code</span>
      <div class="block__item">
        <input type="text" v-model="publicId" />
      </div>
    </div>
    <div class="block">
      <span class="block__label">
        <label for="exampleCurl">Example CURL</label>
      </span>
      <textarea readonly v-model="exampleCurl" id="exampleCurl"/>
    </div>
    <div class="block">
      <span class="block__label">Broadcast</span>
      <button @click="createBroadcast" :disabled="!apiKey || !!store.broadcastUrl || pending">Create</button>
      <button @click="deleteBroadcast" v-if="publicId && apiKey && store.broadcastUrl" :disabled="pending">Delete</button>
    </div>
    <div class="block details" v-if="store.broadcastUrl">
      <span class="block__label">
        <label for="broadcastUrl">
          Broadcast URL
        </label>
      </span>
      <textarea readonly v-model="store.broadcastUrl" />
    </div>
    <div class="block details" v-if="store.broadcastAuth">
      <span class="block__label">
        <label for="broadcastAuth">Broadcast auth</label>
      </span>
      <input readonly v-model="store.broadcastAuth" />
    </div>
    <div class="block details" v-if="store.playbackUrl">
      <span class="block__label">
        <label for="playbackUrl">Playback URL</label>
      </span>
      <textarea readonly v-model="store.playbackUrl" />
    </div>
    <div class="block details" v-if="store.playbackAuth">
      <span class="block__label">
        <label for="playbackAuth">Playback auth</label>
      </span>
      <input readonly v-model="store.playbackAuth" />
    </div>
    <div class="block error block_error" v-if="error">
      <span class="label">Error</span>
      <span>{{ error }}</span>
    </div>
  </section>
</template>

<style>
.qm {
  padding: 2px 8px;
  border-radius: 10px;
}
.qm:link,
.qm:visited,
.qm:hover,
.qm:active {
  color: #fff;
  background-color: #123;
}
</style>