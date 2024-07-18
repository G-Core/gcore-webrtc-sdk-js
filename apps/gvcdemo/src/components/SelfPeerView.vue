<template>
  <PeerView
    class="peer-view_self"
    id="self-peer-view"
    key="self"
    :display-name="displayName"
    :peer-id="'self-peer'"
    :video-track="videoTrack"
    :audio-track="audioTrack"
    :class="{ 'peer-view_before-join': !joined }"
  />
</template>

<script setup lang="ts">
import PeerView from "@/components/PeerView.vue"

defineProps<{
  displayName: string
  videoTrack: MediaStreamTrack | null
  audioTrack: MediaStreamTrack | null
  joined: boolean
}>()
</script>

<style scoped lang="scss">
.peer-view {
  &_self {
    border: 1px solid var(--light-green);

    :deep(video) {
      transform: scaleX(-1);
    }
  }

  &_before-join {
    width: 90vw;
    max-width: 600px;
  }

  &_before-join {
    width: 90vw;
    max-width: 600px;
  }
}
</style>
