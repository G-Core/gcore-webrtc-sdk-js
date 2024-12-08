<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ServerRequestError, StreamMeta, WhipClient, WhipClientEvents } from "@gcorevideo/rtckit";

const emit = defineEmits(['close'])

const props = defineProps<{
  audio: boolean
  auth?: string
  canRestartIce?: boolean
  canTrickleIce?: boolean
  endpoint: string
  icePreferTcp?: boolean
  iceTransportPolicy?: RTCIceTransportPolicy
  video: boolean
  resolution?: number
  // TODO video constraints, audio constraints
}>()

const error = ref<string>('')
const running = ref(false)

const status = computed(() => {
  if (error.value) {
    return 'error'
  }
  if (running.value) {
    return 'streaming'
  }
  return 'started'
})
const resourceUrl = ref('')
const resourceExtensions = ref<string[]>([])

type ConnectionStatus = "disconnected" | "connected" | "connection_failed";
const connStatus = ref<ConnectionStatus>("disconnected");
const reconnects = ref(0);

let client: WhipClient | null = null
let stream: MediaStream | null = null

onMounted(async () => {
  try {
    client = new WhipClient(props.endpoint, {
      auth: props.auth,
      canTrickleIce: props.canTrickleIce,
      canRestartIce: props.canRestartIce,
      icePreferTcp: props.icePreferTcp,
      iceTransportPolicy: props.iceTransportPolicy,
      plugins: [
        new StreamMeta(),
      ],
      useHostIceCandidates: new URL(props.endpoint).hostname === "localhost",
      videoCodecs: ["H264"],
      // maxReconnects: 1,
      // maxWhipRetries: 1,
    })
    stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints())
    client.on(WhipClientEvents.Disconnected, () => {
      connStatus.value = "disconnected";
    });
    client.on(WhipClientEvents.Connected, () => {
      reconnects.value++;
      connStatus.value = "connected";
    });
    client.on(WhipClientEvents.ConnectionFailed, () => {
      connStatus.value = "connection_failed";
    });
    await client.start(stream);
    // TODO get resource URL
    running.value = true
  } catch (e) {
    if (e instanceof ServerRequestError) {
      console.error("Media server error status:%d detail:%o", e.status, e.detail)
    }
    error.value = String(e)
    running.value = false
    setTimeout(() => {
      emit('close')
    }, 5000);
  }
})

onBeforeUnmount(() => {
  if (client) {
    client.close()
    client = null
  }
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
})

function getMediaConstraints() {
  // TODO
  return {
    video: props.video,
    audio: props.audio
  }
}

function restart() {
  if (client) {
    client.restart();
  }
}
</script>

<template>
  <div class="block">
    <span class="label">Status</span>
    <span>
      {{ status }} {{ connStatus }}
      <template v-if="connStatus === 'connected' && reconnects > 1">({{ reconnects }})</template>
    </span>
  </div>
  <div class="block details">
    <span class="label">Resource URL</span>
    <code>{{ resourceUrl }}</code>
  </div>
  <div class="block details" v-if="resourceExtensions && resourceExtensions.length">
    <span class="label">Extensions</span>
    <code>{{ resourceExtensions.join(', ') }}</code>
  </div>
  <div class="block" v-if="status === 'streaming'">
    <button @click="restart">Restart</button>
  </div>
  <div class="block" v-if="error">
    <span class="label">Error</span>
    <span>{{ error }}</span>
  </div>
</template>
