<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { WhipClient, WhipClientEvents } from "@gcorevideo/rtckit/lib/whip";

const emit = defineEmits(['close'])

const props = defineProps<{
  auth?: string
  canRestartIce?: boolean
  canTrickleIce?: boolean
  endpoint: string
  video: boolean
  audio: boolean
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

const ICE_SERVERS = [
  {
    urls: 'stun:ed-c16-95-128-175.fe.gc.onl'
  }
]

onMounted(async () => {
  try {
    client = new WhipClient(props.endpoint, {
      auth: props.auth,
      canTrickleIce: props.canTrickleIce,
      canRestartIce: props.canRestartIce,
      iceServers: ICE_SERVERS,
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
