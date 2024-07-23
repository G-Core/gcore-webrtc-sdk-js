<script setup lang="ts">
import useStream from "~/composables/use-stream";

const stream = await useStream();
</script>

<template>
  <iframe :src="stream.playerUrl" class="w-full max-w-screen-md h-full md:h-auto md:aspect-video" />
</template>