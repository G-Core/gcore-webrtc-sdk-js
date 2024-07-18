<script setup lang="ts">
import { onMounted } from 'vue'
import {
  RouterLink,
  RouterView,
} from 'vue-router'
import { useSessionStore } from './stores/session'
import { useSettingsStore } from './stores/settings'
import { usePlayerUrl } from './composables/playerUrl'

const session = useSessionStore()
const settings = useSettingsStore()
const playerUrl = usePlayerUrl() // TODO player URL from the settings store
onMounted(() => {
  if (settings.isEmpty) {
    settings.useStock()
  }
})
</script>

<template>
  <header>
    <img
      alt="Vue logo"
      class="logo"
      src="@/assets/gcore_black_001.svg"
    />

    <div class="wrapper">
      <nav>
        <span
          class="link-ph"
          v-if="
            session.joined &&
            !session.host
          "
          >Host</span
        >
        <RouterLink to="/host" v-else
          >Host</RouterLink
        >
        <RouterLink to="/settings"
          >Settings</RouterLink
        >
        <RouterLink to="/howto"
          >How to</RouterLink
        >
        <RouterLink
          to="/player"
          v-if="playerUrl"
          >Player</RouterLink
        >
        <span
          class="link-ph"
          v-if="
            session.joined &&
            session.host
          "
          >Guest</span
        >
        <RouterLink to="/guest" v-else
          >Guest</RouterLink
        >
      </nav>
    </div>
  </header>

  <RouterView v-slot="{ Component }">
    <KeepAlive>
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin: 1rem 0;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a,
nav .link-ph {
  display: inline-block;
  padding: 0 1rem;
  border-right: 1px solid
    var(--color-border);
}

nav .link-ph {
  color: #666;
}

nav > *:last-child {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    flex-direction: column;
    place-items: center;
    padding-right: calc(
      var(--section-gap) / 2
    );
    padding-top: 10vh;
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
@media (min-width: 421px) {
  .logo {
    height: 100px;
  }
}
@media (max-width: 420px) {
  .logo {
    max-width: 100%;
    height: auto;
  }
}
</style>
