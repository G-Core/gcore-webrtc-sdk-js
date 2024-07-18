<script setup lang="ts">
defineProps<{
  t?: boolean
}>()
</script>

<template>
  <div class="control-block">
    <div class="block-caption">
      <slot name="caption"></slot>
    </div>
    <div class="block-content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.control-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.block-caption {
  font-weight: bold;
}
.block-content {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
</style>