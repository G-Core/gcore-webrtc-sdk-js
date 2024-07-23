<script setup lang="ts">
const config = useRuntimeConfig()

console.log("version: ", config.appVersion)
</script>

<template>
  <NuxtPage />
</template>
