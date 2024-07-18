<template>
  <main class="settings">
    <h1>Settings</h1>
    <form class="section">
      <div
        class="block block_field field__required"
      >
        <label
          for="whip-endpoint"
          title="Is used to ingest the host stream"
          >Host stream WHIP endpoint
          *</label
        >
        <input
          id="whip-endpoint"
          v-model="
            settings.whipEndpoint
          "
          type="text"
          :disabled="online"
        />
      </div>
      <div class="block block_field">
        <label
          for="whip-auth"
          title="Protects access to the host stream"
          >Host stream auth</label
        >
        <input
          id="whip-auth"
          v-model="settings.whipAuth"
          type="text"
          :disabled="online"
        />
      </div>
      <div class="block block_field">
        <label
          for="whep-endpoint"
          title="Used to play the host stream"
          >Host stream WHEP
          endpoint</label
        >
        <input
          id="whep-endpoint"
          v-model="
            settings.whepEndpoint
          "
          :disabled="online"
        />
      </div>
      <div class="block block_field">
        <label
          for="whip-endpoint-guest"
          title="Is used to send a guest stream to the host"
          >Guest stream WHIP
          endpoint</label
        >
        <input
          id="whip-endpoint-guest"
          v-model="
            settings.whipEndpointGuest
          "
          type="text"
          :disabled="online"
        />
      </div>
      <div class="block block_field">
        <label
          for="whip-auth-guest"
          title="Protects access to the guest stream"
          >Guest stream auth</label
        >
        <input
          id="whip-auth-guest"
          v-model="
            settings.whipAuthGuest
          "
          type="text"
          :disabled="online"
        />
      </div>
      <div class="block block_field">
        <label
          for="whep-endpoint-guest"
          title="For receiving a guest stream on the host side"
          >Guest stream WHEP
          endpoint</label
        >
        <input
          id="whep-endpoint-guest"
          v-model="
            settings.whepEndpointGuest
          "
          :disabled="online"
        />
      </div>
      <div class="block block_field">
        <label
          for="player-url"
          title="Plays back the host stream, which should be active"
          >Player URL</label
        >
        <input
          id="player-url"
          v-model="settings.playerUrl"
          :disabled="online"
        />
      </div>
      <div class="block block_field">
        <label for="ice-servers"
          >ICE servers</label
        >
        <textarea
          id="ice-servers"
          v-model="
            settings.iceServersRaw
          "
          :disabled="online"
        />
      </div>
      <div class="block block_buttons">
        <label />
        <button
          @click.prevent="clear"
          :disabled="
            settings.isEmpty || online
          "
        >
          Clear
        </button>
        <button
          @click.prevent="
            settings.useStock
          "
          :disabled="online"
        >
          Use stock
        </button>
      </div>
      <div
        class="block block_notice"
        v-if="online"
      >
        <label />
        <span class="notice">
          Can't change settings while in
          a session, leave it first
        </span>
      </div>
    </form>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useSessionStore } from '@/stores/session'
const settings = useSettingsStore()
const session = useSessionStore()
const online = computed(
  () =>
    session.joined && !session.ended,
)

function clear() {
  settings.whipEndpoint = ''
  settings.whipEndpointGuest = ''
  settings.whipAuth = ''
  settings.whepEndpoint = ''
  settings.whepEndpointGuest = ''
  settings.whepAuth = ''
  settings.whipAuthGuest = ''
  settings.whepAuthGuest = ''
  settings.iceServersRaw = ''
  settings.playerUrl = ''
}
</script>

<style>
form {
  padding: 1rem 0;
}
form .block {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}
form .block label {
  flex: 150px 0 0;
  font-weight: 600;
}
form .block input,
form .block textarea {
  width: 300px;
  max-width: auto;
}
@media (max-width: 420px) {
  form .block_field {
    flex-direction: column;
    gap: 0.25rem;
  }
  .block_buttons label {
    display: none;
  }
  form .block label {
    flex-basis: auto;
  }
}
</style>
