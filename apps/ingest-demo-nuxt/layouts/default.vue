<script setup lang="ts">

const auth = useAuth()
</script>

<template>
  <div
    class="container mx-auto h-screen flex flex-col"
  >
    <NuxtRouteAnnouncer />
    <header class="w-full my-8 px-2">
      <div
        class="flex basis-auto items-center flex-wrap gap-4 mb-4"
      >
        <img
          src="~/assets/img/gcore_black_001.svg"
          alt="Gcore logo"
          class="basis-1/3 w-1/3 max-w-48"
        />
        <div
          class="flex-auto text-slate-700 text-2xl"
        >
          <slot name="header"
            >Here we go</slot
          >
        </div>
      </div>
      <nav class="my-2 flex gap-2 mb-4">
        <router-link to="/" class="r"
          >Home</router-link
        >
        <router-link to="/settings"
          >Settings</router-link
        >
        <router-link
          :to="`/host?token=${auth?.token}`"
          v-if="!!auth"
          >Host</router-link
        >
      </nav>
    </header>
    <main class="basis-full px-2">
      <slot></slot>
    </main>
    <footer
      class="w-full mt-8 mb-4 mx-auto basis-auto"
    >
      <div
        class="m:w-24 flex justify-evenly gap-4"
      >
        <img
          src="~/assets/img/h264-logo.svg"
          alt="H264 logo"
          class="basis-1/2 w-1/2 max-w-24"
        />
        <img
          src="~/assets/img/opus-logo.svg"
          alt="Opus logo"
          class="basis-1/2 w-1/2 max-w-24"
        />
      </div>
    </footer>
  </div>
</template>

<style scoped>
@tailwind components;

@layer components {
  nav a {
    text-decoration: none;
    text-transform: lowercase;
    @apply rounded py-1 px-2;
    @apply text-orange-500 hover:text-orange-500 bg-transparent;
  }
  .router-link-active {
    cursor: default;
    @apply text-slate-700 hover:text-slate-700 bg-slate-100;
  }
}
</style>
