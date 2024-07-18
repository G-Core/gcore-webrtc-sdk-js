import { useSettingsStore } from "@/stores/settings"
import { computed } from "vue"

export function usePlayerUrl() {
  const settings = useSettingsStore()
  const playerUrl = computed(() =>
    settings.playerUrl
    // settings.whipEndpoint === "https://whip.preprod.gvideo.co/stream9/whip"
    //   ? "https://player.gvideo.co/streams/2675_1523286"
    //   : ""
  )
  return playerUrl
}
