<template>
  <section class="leave">
    <button class="leave__btn" @click="emit('leave')" v-if="!noLeave">Leave the call</button>
    <button class="leave__btn" @click="emit('create')" v-if="!noCreate">Create new room</button>
    <button class="leave__btn leave__btn_cancel" @click="emit('cancel')" v-if="!noCancel">
      Cancel
    </button>
  </section>
</template>

<script setup lang="ts">
const emit = defineEmits(["leave", "create", "cancel"])
defineProps<{ noLeave?: boolean; noCreate?: boolean; noCancel?: boolean }>()
</script>

<style scoped lang="scss">
.leave {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__btn {
    display: flex;
    justify-content: center;
    border: 2px solid var(--text);
    border-radius: 8px;
    padding: 10px 32px;
    width: 100%;
    font-weight: 600;
    background-color: inherit;
    font-size: inherit;
    color: inherit;
    cursor: pointer;

    &_cancel {
      background-color: #c8010150;
    }

    &:hover {
      opacity: var(--l-opacity);
    }
  }
}
</style>
