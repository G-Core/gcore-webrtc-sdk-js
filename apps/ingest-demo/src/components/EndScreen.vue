<template>
  <div class="end-screen">
    <p>FIN</p>
    <button @click="reload">
      Start over
    </button>
  </div>
</template>

<script setup lang="ts">
function reload() {
  window.location.reload()
}
</script>

<style scoped>
.end-screen {
  display: flex;
  place-items: center;
  place-content: center;
  height: 50vh;
  flex-direction: column;
  gap: 1rem;
}
.end-screen p {
  font-size: 2rem;
}
</style>
