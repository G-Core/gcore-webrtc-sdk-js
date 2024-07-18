<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { WebRTCPlayer } from '@eyevinn/webrtc-player';

const emit = defineEmits(['close']);

const props = defineProps<{
  endpoint: string;
  auth?: string;
  audio: boolean;
  video: boolean;
}>();

const error = ref<string>('');
const running = ref(false);
const status = computed(() => {
  if (error.value) {
    return 'error'
  }
  if (playing.value) {
    return 'playing'
  }
  if (running.value) {
    return 'connected'
  }
  return 'connecting'
})
const videoElem = ref<HTMLVideoElement | null>(null);
const playing = ref(false);

let player: WebRTCPlayer | null = null;

onMounted(async () => {
  playing.value = false
  try {
    player = new WebRTCPlayer({
      video: videoElem.value as HTMLVideoElement,
      type: "whep",
      mediaConstraints: {
        audioOnly: props.audio && !props.video,
        videoOnly: props.video && !props.audio,
      },
    });
    await player.load(new URL(props.endpoint), props.auth)
    player.unmute()
    // @ts-expect-error odd type
    player.on('no-media', () => {
      error.value = 'media timeout occured'
    });
    // @ts-expect-error odd type
    player.on('media-recovered', () => {
      error.value = ''
    });
    if (videoElem.value) {
      videoElem.value.onplaying = () => {
        playing.value = true
      }
      videoElem.value.onended = () => {
        playing.value = false
      }
    }
    running.value = true
  } catch (e) {
    error.value = String(e);
    running.value = false;
    playing.value = false
    emit('close')
  }
})

onBeforeUnmount(() => {
  if (player) {
    player.destroy()
    player = null
  }
})

</script>

<template>
  <div class="block">
    <span class="label">Status</span>
    <span>{{ status }}</span>
  </div>
  <div class="block" v-if="error">
    <span class="label">Error</span>
    <span>{{ error }}</span>
  </div>
  <div class="block">
    <video ref="videoElem" controls autoplay playsinline></video>
  </div>
</template>
