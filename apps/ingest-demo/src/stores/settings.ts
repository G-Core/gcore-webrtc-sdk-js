import { defineStore } from 'pinia'
import {
  computed,
  ref,
  watch,
} from 'vue'

// @ts-ignore-next-line
import STOCK_SETTINGS from '@deployconfig'

type AppSettings = {
  whipEndpoint: string
  whipAuth?: string
  whepEndpoint: string
  whepAuth?: string
  iceServersRaw?: string
  whipEndpointGuest: string
  whipAuthGuest?: string
  whepEndpointGuest: string
  whepAuthGuest?: string
  playerUrl: string
}

const DEFAULT_ICE_SERVERS =
  'stun:drc-c2-93-115-196.fe.gc.onl'

export const useSettingsStore =
  defineStore('settings', () => {
    const whipEndpoint = ref(
      localStorage.getItem(
        'whipEndpoint',
      ) || '',
    )
    const whipAuth = ref(
      localStorage.getItem(
        'whipAuth',
      ) || '',
    )
    const whepEndpoint = ref(
      localStorage.getItem(
        'whepEndpoint',
      ) || '',
    )
    const whepAuth = ref(
      localStorage.getItem(
        'whepAuth',
      ) || '',
    )
    const iceServersRaw = ref(
      localStorage.getItem(
        'iceServersRaw',
      ) || '',
    )
    const iceServers = ref<
      RTCIceServer[]
    >(
      parseIceServers(
        iceServersRaw.value,
      ),
    )
    const whipEndpointGuest = ref(
      localStorage.getItem(
        'whipEndpointGuest',
      ) || '',
    )
    const whipAuthGuest = ref(
      localStorage.getItem(
        'whipAuthGuest',
      ) || '',
    )
    const whepEndpointGuest = ref(
      localStorage.getItem(
        'whepEndpointGuest',
      ) || '',
    )
    const whepAuthGuest = ref(
      localStorage.getItem(
        'whepAuthGuest',
      ) || '',
    )
    const playerUrl = ref(
      localStorage.getItem(
        'playerUrl',
      ) || '',
    )

    watch(
      whipEndpoint,
      async (newVal) => {
        localStorage.setItem(
          'whipEndpoint',
          newVal,
        )
      },
    )

    watch(whipAuth, (newVal) => {
      localStorage.setItem(
        'whipAuth',
        newVal,
      )
    })

    watch(whepEndpoint, (newVal) => {
      localStorage.setItem(
        'whepEndpoint',
        newVal,
      )
    })

    watch(whepAuth, (newVal) => {
      localStorage.setItem(
        'whepAuth',
        newVal,
      )
    })

    watch(iceServersRaw, (newVal) => {
      localStorage.setItem(
        'iceServersRaw',
        newVal,
      )
      iceServers.value =
        parseIceServers(newVal)
    })

    watch(
      whipEndpointGuest,
      (newVal) => {
        localStorage.setItem(
          'whipEndpointGuest',
          newVal,
        )
      },
    )

    watch(
      whepEndpointGuest,
      (newVal) => {
        localStorage.setItem(
          'whepEndpointGuest',
          newVal,
        )
      },
    )

    watch(whipAuthGuest, (newVal) => {
      localStorage.setItem(
        'whipAuthGuest',
        newVal,
      )
    })

    watch(whepAuthGuest, (newVal) => {
      localStorage.setItem(
        'whepAuthGuest',
        newVal,
      )
    })

    watch(playerUrl, (newVal) => {
      localStorage.setItem(
        'playerUrl',
        newVal,
      )
    })

    async function useStock() {
      // TODO support searchParams.hostname
      const url = new URL(location.href)
      const key =
        import.meta.env.VITE_LOCAL ===
        'true'
          ? url.searchParams.get(
              'hostname',
            ) || url.hostname
          : url.hostname
      const stockSettings:
        | AppSettings
        | undefined =
        STOCK_SETTINGS[key]
      if (stockSettings) {
        whipEndpoint.value =
          stockSettings.whipEndpoint
        whipAuth.value =
          stockSettings.whipAuth || ''
        whepEndpoint.value =
          stockSettings.whepEndpoint
        whepAuth.value =
          stockSettings.whepAuth || ''
        iceServersRaw.value =
          stockSettings.iceServersRaw ||
          ''
        whipEndpointGuest.value =
          stockSettings.whipEndpointGuest
        whipAuthGuest.value =
          stockSettings.whipAuthGuest ||
          ''
        whepEndpointGuest.value =
          stockSettings.whepEndpointGuest
        whepAuthGuest.value =
          stockSettings.whepAuthGuest ||
          ''
        playerUrl.value =
          stockSettings.playerUrl
      }
      if (!iceServersRaw.value) {
        iceServersRaw.value =
          DEFAULT_ICE_SERVERS
      }
    }

    const isEmpty = computed(() => {
      return (
        !whipEndpoint.value &&
        !whipAuth.value &&
        !whepEndpoint.value &&
        !whepAuth.value &&
        !iceServersRaw.value &&
        !whipEndpointGuest.value &&
        !whipAuthGuest.value &&
        !whepEndpointGuest.value &&
        !whepAuthGuest.value &&
        !playerUrl.value
      )
    })

    return {
      isEmpty,
      whipEndpoint,
      whipAuth,
      whepEndpoint,
      whepAuth,
      iceServers,
      iceServersRaw,
      whipEndpointGuest,
      whepEndpointGuest,
      whipAuthGuest,
      whepAuthGuest,
      playerUrl,
      useStock,
    }
  })

function parseIceServers(
  src: string | null,
): RTCIceServer[] {
  if (!src) {
    return []
  }
  const servers: RTCIceServer[] = []
  src.split('\n').forEach((line) => {
    const [url, u, p] = line.split(';')
    if (url.startsWith('stun:')) {
      servers.push({
        urls: [url],
      })
    } else if (
      url.startsWith('turn:')
    ) {
      const s: RTCIceServer = {
        urls: [url],
      }
      const username = u
        ? u.trim()
        : undefined
      if (username) {
        s.username = username
      }
      const credential = p
        ? p.trim()
        : undefined
      if (credential) {
        s.credential = credential
      }
      servers.push(s)
    }
  })
  return servers
}

function serializeIceServers(
  iceServers: RTCIceServer[],
): string {
  if (!iceServers.length) {
    return ''
  }
  return iceServers
    .map((server) => {
      const url = server.urls[0]
      if (
        server.username &&
        server.credential
      ) {
        return `${url};${server.username};${server.credential}`
      }
      return url
    })
    .join('\n')
}
