<template>
  <header class="header">
    <h1 class="header__title">SDK Demo app</h1>
  </header>
  <main>
    <RouterView></RouterView>
  </main>
</template>

<script setup lang="ts">
</script>

<style lang="scss">
@import "@/assets/base.scss";

.header {
  padding: 20px;

  &__title {
    font-weight: bold;
    opacity: var(--l-opacity);
    text-align: center;
  }
}

main {
  display: flex;
  flex-grow: 1;
}

main {
  display: flex;
  flex-grow: 1;
}
</style>
