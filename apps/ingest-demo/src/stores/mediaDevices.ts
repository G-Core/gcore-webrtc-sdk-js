import { defineStore } from 'pinia'
import {
  type Ref,
  readonly,
  ref,
  watch,
} from 'vue'

import { useWebrtcStreaming } from "../composables/webrtcStreaming";

type VideoResolution = {
  width: number
  height: number
}

type StdVRes = 1080 | 720 | 480 | 360 | 240

const VIDEORES: Record<
  StdVRes,
  VideoResolution
> = {
  '1080': {
    width: 1920,
    height: 1080,
  },
  '720': {
    width: 1280,
    height: 720,
  },
  '480': {
    width: 854,
    height: 480,
  },
  '360': {
    width: 640,
    height: 360,
  },
  '240': {
    width: 426,
    height: 240,
  },
}

const MAX_VIDEORES: VideoResolution = VIDEORES['1080']

const webrtcStreaming = useWebrtcStreaming()

export const useMediaDevicesStore =
  defineStore('mediaDevices', () => {
    const microphoneDevices = ref<
      MediaDeviceInfo[]
    >([])
    const cameraDevices = ref<
      MediaDeviceInfo[]
    >([])

    const videores = ref<VideoResolution[]>([])

    const pending = ref(false)

    const videoConstraints = ref<{
      width: number
      height: number
    }>(MAX_VIDEORES)

    const cameraEnabled = ref(false)

    const error = ref('')

    const microphoneEnabled = ref(false)
    // const microphoneUnavail = ref(false)

    const micDeviceId = ref('')
    const cameraDeviceId = ref('')

    const willUseMic = ref(false)
    const willUseCamera = ref(true)

    const videoTrack =
      ref<MediaStreamTrack | null>(null)
    const audioTrack =
      ref<MediaStreamTrack | null>(null)

    watch(
      [micDeviceId, cameraDeviceId],
      ([mic, cam]: [
        string | null,
        string | null,
      ]) => {
        if (
          (mic &&
            microphoneEnabled.value) ||
          (cam && cameraEnabled.value)
        ) {
          openUserMedia()
        }
      },
    )

    watch(cameraDeviceId, (deviceId) => {
      if (deviceId) {
        videores.value = webrtcStreaming.webrtc.mediaDevices.getAvailableVideoResolutions(deviceId)
      }
    })

    async function updateDevices() {
      const webrtc = webrtcStreaming.webrtc
      pending.value = true
      await webrtc.mediaDevices
        .getMicrophones()
        .then((mics) => {
          microphoneDevices.value = mics
          if (
            mics.length &&
            !micDeviceId.value
          ) {
            micDeviceId.value =
              mics[0].deviceId
          }
        })
        .catch(e => {
          console.error("getMicrophones", e)
        })
        .then(() => webrtc.mediaDevices.getCameras())
        .then((cameras) => {
          cameraDevices.value = cameras
          if (
            cameras.length &&
            !cameraDeviceId.value
          ) {
            cameraDeviceId.value =
              cameras[0].deviceId
          }
        })
        .finally(() => {
          pending.value = false
        })
    }

    function getAudioConstraints() {
      if (!willUseMic.value) {
        return false
      }
      if (micDeviceId.value) {
        return {
          deviceId: micDeviceId.value,
        }
      }
      return true
    }

    function getVideoConstraints() {
      if (!willUseCamera.value) {
        return false
      }
      const constr: MediaTrackConstraintSet =
        { ...videoConstraints.value }
      if (cameraDeviceId.value) {
        constr.deviceId = {
          exact: cameraDeviceId.value,
        }
      }
      return constr
    }

    async function getUserMedia(): Promise<MediaStream> {
      const constraints = {
        audio: getAudioConstraints(),
        video: getVideoConstraints(),
      }
      pending.value = true
      return navigator.mediaDevices
        .getUserMedia(constraints)
        .finally(() => {
          pending.value = false
        })
    }

    async function openUserMedia(): Promise<void> {
      if (videoTrack.value) {
        videoTrack.value.stop()
        videoTrack.value = null
      }
      if (audioTrack.value) {
        audioTrack.value.stop()
        audioTrack.value = null
      }
      try {
        const stream =
          await getUserMedia()
        audioTrack.value =
          stream.getAudioTracks()[0] ||
          null
        if (
          audioTrack.value &&
          !microphoneEnabled.value
        ) {
          audioTrack.value.enabled =
            false
        }
        videoTrack.value =
          stream.getVideoTracks()[0] ||
          null
        if (
          videoTrack.value &&
          !cameraEnabled.value
        ) {
          videoTrack.value.enabled =
            false
        }
      } catch (e) {
        console.error(
          'openUserMedia error',
          e,
        )
        error.value = String(e)
        return
      }
      if (shouldUpdateDevices()) {
        updateDevices()
      }
    }

    function shouldUpdateDevices() {
      return (
        !cameraDevices.value.filter(
          ({ label }) => !!label,
        ).length &&
        !microphoneDevices.value.filter(
          ({ label }) => !!label,
        ).length
      )
    }

    async function toggleCamera(
      on: boolean,
    ) {
      await toggleDevice(
        videoTrack,
        cameraEnabled,
        on,
      )
    }

    async function toggleDevice(
      track: Ref<MediaStreamTrack | null>,
      enabled: Ref<boolean>,
      on: boolean,
    ) {
      enabled.value = on
      if (track.value) {
        track.value.enabled = on
      } else {
        if (on) {
          await openUserMedia()
        }
      }
    }

    async function toggleMicrophone(
      on: boolean,
    ) {
      willUseMic.value = on
      await toggleDevice(
        audioTrack,
        microphoneEnabled,
        on,
      )
    }

    async function selectCamera(
      deviceId: string,
    ) {
      if (
        cameraDeviceId.value ===
        deviceId
      ) {
        return
      }
      cameraDeviceId.value = deviceId
    }

    async function selectMicrophone(
      deviceId: string,
    ) {
      if (
        micDeviceId.value === deviceId
      ) {
        return
      }
      micDeviceId.value = deviceId
    }

    function close() {
      if (videoTrack.value) {
        videoTrack.value.stop()
        videoTrack.value = null
      }
      if (audioTrack.value) {
        audioTrack.value.stop()
        audioTrack.value = null
      }
    }

    async function setVideoQuality(
      q: string,
    ) {
      if (!(q in VIDEORES)) {
        return
      }
      const newVq = VIDEORES[q]
      if (
        sameConstraints(
          newVq,
          videoConstraints.value,
        )
      ) {
        return
      }

      videoConstraints.value = newVq
      if (
        cameraEnabled.value &&
        videoTrack.value
      ) {
        await openUserMedia()
      }
    }

    return {
      audioTrack,
      videoTrack,
      cameraDevices: readonly(
        cameraDevices,
      ),
      cameraDeviceId: readonly(
        cameraDeviceId,
      ),
      cameraEnabled: readonly(
        cameraEnabled,
      ),
      microphoneDevices: readonly(
        microphoneDevices,
      ),
      micDeviceId: readonly(
        micDeviceId,
      ),
      microphoneEnabled: readonly(
        microphoneEnabled,
      ),
      pending: readonly(pending),
      videores: readonly(videores),
      willUseCamera,
      willUseMic,

      close,
      openUserMedia,
      selectCamera,
      selectMicrophone,
      setVideoQuality,
      toggleCamera,
      toggleMicrophone,
      updateDevices,
    }
  })

function sameConstraints(
  a: { width: number; height: number },
  b: { width: number; height: number },
) {
  return (
    a.width === b.width &&
    a.height === b.height
  )
}
