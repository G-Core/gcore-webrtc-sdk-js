<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <header>
    <img alt="Gcore logo" class="logo" src="@/assets/gcore_black_001.svg" height="125" />

    <div class="wrapper">
      <HelloWorld />

      <nav>
        <RouterLink to="/settings">Settings</RouterLink>
        <RouterLink to="/whip">WHIP</RouterLink>
        <RouterLink to="/whep">WHEP</RouterLink>
        <RouterLink to="/tools">Other tools</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView v-slot="{ Component }">
    <KeepAlive>
      <component :is="Component" />
    </KeepAlive>
  </RouterView>

  <footer>
    <p>Built with
      <b>Eyevinn</b>'s
      <a href="https://www.npmjs.com/package/@eyevinn/webrtc-player" target="_blank">WebRTC Player</a>
    </p>
  </footer>
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
  width: 100%;
  max-width: 400px;
  height: auto;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    flex-direction: column;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    /* margin: 0 2rem 0 0; */
    margin: 0 0 2rem;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: center;
    /* margin-left: -1rem; */
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
