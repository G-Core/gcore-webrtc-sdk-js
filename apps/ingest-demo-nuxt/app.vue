<script setup lang="ts">
const config = useRuntimeConfig()

console.log("Version:", config.appVersion)
</script>

<template>
  <NuxtPage />
</template>
