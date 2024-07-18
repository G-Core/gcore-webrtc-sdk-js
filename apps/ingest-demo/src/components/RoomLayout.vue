<script setup lang="ts">
import {
  computed,
  onUnmounted,
  ref,
} from 'vue'

import { useSettingsStore } from '@/stores/settings'
import { useMediaDevicesStore } from '@/stores/mediaDevices'
import { useSessionStore } from '@/stores/session'

import RoomIntro from '@/components/RoomIntro.vue'
import RoomSession from '@/components/RoomSession.vue'
import EndScreen from '@/components/EndScreen.vue'

const props = defineProps<{
  host?: boolean
}>()

const settings = useSettingsStore()
const mediaDevices =
  useMediaDevicesStore()
const session = useSessionStore()
const error = ref<string>('')
const errorDetails = ref<string>('')
const endpoint = computed(() =>
  props.host
    ? settings.whipEndpoint
    : settings.whipEndpointGuest,
)
const endpointLabel = computed(() =>
  props.host ? 'Host' : 'Guest',
)

onUnmounted(async () => {
  // TODO watch settings change
  error.value = ''
  errorDetails.value = ''
  await mediaDevices.close()
})
</script>

<template>
  <main>
    <div v-if="!endpoint" class="error">
      <p>
        Endpoint is not configured<br />
        Go configure the
        <b
          >{{ endpointLabel }} WHIP
          endpoint</b
        >
        on the
        <router-link to="/settings"
          >settings tab</router-link
        >
      </p>
    </div>
    <template v-else>
      <EndScreen v-if="session.ended" />
      <RoomIntro
        v-else-if="!session.joined"
        :host="host"
      />
      <RoomSession
        v-else
        :host="host"
      />
    </template>
  </main>
</template>
