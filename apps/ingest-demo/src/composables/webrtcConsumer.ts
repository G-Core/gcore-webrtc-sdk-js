import { readonly, ref } from 'vue'
import { WebRTCPlayer } from '@eyevinn/webrtc-player'
import { reportError } from '@gcorevideo/rtckit/lib/trace'

type WebrtcConsumeParams = {
  iceServers?: RTCIceServer[]
}

const noop = () => {}

const T = 'webrtcConsumer'

export const useWebrtcConsumer =
  (function () {
    let player: WebRTCPlayer | null =
      null

    const noMedia = ref(true)
    const pending = ref(false)

    let storedEndpoint: string = ''
    let storedAuth: string | undefined =
      undefined

    let reconnectTimerId:
      | number
      | null = null

    let resetListeners = noop

    function scheduleReconnect() {
      if (reconnectTimerId) {
        clearTimeout(reconnectTimerId)
      }
      reconnectTimerId = setTimeout(
        () => {
          reconnectTimerId = null
          if (
            player &&
            storedEndpoint
          ) {
            connect(
              player,
              storedEndpoint,
              storedAuth,
            )
          }
        },
        3000 + 1000 * Math.random(),
      ) as any
    }

    async function setup(
      elem: HTMLVideoElement,
      params: WebrtcConsumeParams,
    ) {
      if (player) {
        await stop()
        resetListeners()
        resetListeners = noop
        player.destroy()
      }
      player = new WebRTCPlayer({
        video: elem,
        type: 'whep',
        iceServers: params.iceServers,
        timeoutThreshold: 10000,
      })
      // TODO call resetVideoElement on reconnect
      const onConnectError = (
        e: string,
      ) => {
        console.error(
          `${T} connect error`,
          e,
        )
        resetVideoElement(elem)
        scheduleReconnect()
      }
      const onPeerConnectionFailed =
        () => {
          console.error(
            `${T} peer connection failed`,
          )
          resetVideoElement(elem)
        }
      const onNoMedia = () => {
        noMedia.value = true
      }
      const onMediaRecovered = () => {
        noMedia.value = false
      }

      // @ts-expect-error odd type
      player.on(
        'initial-connection-failed',
        onConnectError,
      )
      // @ts-expect-error odd type
      player.on(
        'connect-error',
        onConnectError,
      )
      // @ts-expect-error odd type
      player.on('no-media', onNoMedia)
      // @ts-expect-error odd type
      player.on(
        'media-recovered',
        onMediaRecovered,
      )
      // @ts-expect-error odd type
      player.on(
        'peer-connection-failed',
        onPeerConnectionFailed,
      )

      resetListeners = () => {
        // @ts-expect-error odd type
        player.off(
          'initial-connection-failed',
          onConnectError,
        )
        // @ts-expect-error odd type
        player.off(
          'connect-error',
          onConnectError,
        )
        // @ts-expect-error odd type
        player.off(
          'no-media',
          onNoMedia,
        )
        // @ts-expect-error odd type
        player.off(
          'media-recovered',
          onMediaRecovered,
        )
        // @ts-expect-error odd type
        player.off(
          'peer-connection-failed',
          onPeerConnectionFailed,
        )
      }
    }

    async function stop() {
      if (reconnectTimerId) {
        clearTimeout(reconnectTimerId)
        reconnectTimerId = null
      }
      if (player) {
        player.stop()
        await player.unload()
        noMedia.value = true
      }
    }

    async function connect(
      player: WebRTCPlayer,
      endpoint: string,
      auth?: string,
    ) {
      storedAuth = auth
      storedEndpoint = endpoint
      pending.value = true
      try {
        await player.load(
          new URL(endpoint),
          auth,
        )
        noMedia.value = false
        player.unmute()
      } catch (e) {
        reportError(e)
      }
      pending.value = false
    }

    // TODO incorporate timer
    async function play(
      endpoint: string,
      auth?: string,
    ) {
      if (!player) {
        console.error('No player')
        return
      }

      await connect(
        player,
        endpoint,
        auth,
      )
    }
    // TODO auto-restart playback

    return () => ({
      noMedia: readonly(noMedia),
      pending: readonly(pending),
      play,
      setup,
      stop,
    })

    function resetVideoElement(
      elem: HTMLVideoElement,
    ) {
      if (
        elem.srcObject instanceof
        MediaStream
      ) {
        const stream = elem.srcObject
        stream
          .getTracks()
          .forEach((track) => {
            stream.removeTrack(track)
            track.stop()
          })
        elem.srcObject = null
      }
    }
  })()
