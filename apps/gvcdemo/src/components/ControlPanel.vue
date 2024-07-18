<template>
  <section class="control-panel">
    <ControlBtn @click="emit('toggleMic')">
      <component :is="hasAudio ? MicOnIcon : MicOffIcon"></component>
    </ControlBtn>
    <ControlBtn @click="emit('toggleCamera')">
      <component :is="hasVideo ? CamOnIcon : CamOffIcon"></component>
    </ControlBtn>
  </section>
</template>

<script setup lang="ts">
import ControlBtn from "@/components/ControlBtn.vue"
import MicOnIcon from "@/components/icons/MicOnIcon.vue"
import CamOnIcon from "@/components/icons/CamOnIcon.vue"
import MicOffIcon from "@/components/icons/MicOffIcon.vue"
import CamOffIcon from "@/components/icons/CamOffIcon.vue"

const emit = defineEmits(["toggleCamera", "toggleMic"])
defineProps<{ hasVideo: boolean; hasAudio: boolean }>()
</script>

<style scoped lang="scss">
.control-panel {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}
</style>
