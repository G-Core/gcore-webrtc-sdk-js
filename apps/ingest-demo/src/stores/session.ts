import { defineStore } from "pinia"
import { computed, readonly, ref } from "vue"

import { useSettingsStore } from "./settings"

export const useSessionStore = defineStore("joinRequest", () => {
  const joined = ref(false)
  const joining = ref(false)
  const joinAskSent = ref(false)
  const ended = ref(false)
  const host = ref(false)
  const pending = ref(false)
  const peerId = ref<string>()

  const settings = useSettingsStore()

  const roomId = computed(() => settings.whipEndpoint
    ? parseRoomId(settings.whipEndpoint)
    : ""
  )

  async function join(asHost: boolean) {
    if (joined.value || joining.value) {
      console.log(`Already joining/joined as ${host.value ? "host" : "guest"}`)
      return
    }
    joining.value = true
    peerId.value = getPeerId(asHost)
    pending.value = true
    host.value = asHost
    setTimeout(() => {
      joined.value = true
      pending.value = false
      joining.value = false
    }, 1000 + Math.random() * 1000)
  }

  function leave() {
    ended.value = true
    joined.value = false
    joining.value = false
  }

  return {
    ended: readonly(ended),
    host: readonly(host),
    joined: readonly(joined),
    joinning: readonly(joining),
    joinAskSent: readonly(joinAskSent),
    peerId: readonly(peerId),
    pending: readonly(pending),
    roomId: readonly(roomId),
    join,
    leave,
  }
})

function getPeerId(host: boolean): string {
  const urlParam = new URL(window.location.href).searchParams.get('peerId')
  if (urlParam) {
    return urlParam
  }
  return `${host ? "host" : "guest"}-${crypto.randomUUID()}`;
}

function parseRoomId(whipEndpoint: string): string {
  // https://whip.preprod.gvideo.co/stream9/whip -> stream9
  return new URL(whipEndpoint).pathname.split("/")[1]
}