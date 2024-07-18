<template>
  <button class="control-btn">
    <slot />
  </button>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.control-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px;
  border: 2px solid var(--text);
  border-radius: 50%;
  background-color: var(--verdigris);
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
