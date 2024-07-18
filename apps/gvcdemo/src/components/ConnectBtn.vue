<template>
  <button
    class="connect-btn"
    :disabled="(!connected && !joined) || !haveName"
    @click="emit(joined ? 'leave' : 'join')"
  >
    <template v-if="joined"> Leave the call </template>
    <template v-else>
      {{ ask ? "Ask to join" : "Start call" }}
    </template>
  </button>
</template>

<script setup lang="ts">
defineProps<{ ask: boolean; joined: boolean; connected: boolean; haveName: boolean }>()
const emit = defineEmits(["join", "leave"])
</script>

<style scoped lang="scss">
.connect-btn {
  display: flex;
  border: 2px solid var(--text);
  border-radius: 8px;
  padding: 10px 32px;
  width: fit-content;
  font-weight: 600;
  background-color: inherit;
  font-size: inherit;
  color: inherit;
  cursor: pointer;

  &:hover {
    opacity: var(--l-opacity);
  }

  &:disabled {
    pointer-events: none;
    opacity: var(--m-opacity);
  }
}
</style>
