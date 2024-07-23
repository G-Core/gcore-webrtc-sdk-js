import { watch } from 'vue'

export default function useUserMedia() {
  const mediaDevices = useMediaDevices()
  const state = useState<{
    audioTrack: MediaStreamTrack | null
    cameraEnabled: boolean
    error: string
    micEnabled: boolean
    stream: MediaStream | null
    videoTrack: MediaStreamTrack | null
  }>('userMedia', () => ({
    audioTrack: null,
    cameraEnabled: true,
    error: '',
    micEnabled: true,
    stream: null,
    videoTrack: null,
  }))
  const constraints = computed(() => ({
    audio: mediaDevices.value.willUseMic
      ? mediaDevices.value.micDeviceId
        ? {
            deviceId: {
              exact:
                mediaDevices.value
                  .micDeviceId,
            },
          }
        : true
      : false,
    video: mediaDevices.value
      .willUseCamera
      ? buildVideoConstraints(
          mediaDevices.value
            .cameraDeviceId ||
            mediaDevices.value
              .cameraDevicesList[0]
              ?.deviceId,
          mediaDevices.value
            .videoConstraints,
        )
      : false,
  }))
  watch(
    () => foldConstraints(constraints.value),
    async () => {
      closeTracks()
      if (
        constraints.value.audio ===
          false &&
        constraints.value.video ===
          false
      ) {
        return
      }
      try {
        const s =
          await navigator.mediaDevices.getUserMedia(
            constraints.value,
          )
        state.value.stream = s
        await updateDevicesList()
        s.getTracks().forEach(
          (track) => {
            if (
              track.kind === 'audio'
            ) {
              state.value.audioTrack =
                track
              track.addEventListener(
                'ended',
                () => {
                  if (
                    state.value
                      .audioTrack ===
                    track
                  ) {
                    state.value.audioTrack =
                      null
                  }
                },
              )
            } else {
              state.value.videoTrack =
                track
              track.addEventListener(
                'ended',
                () => {
                  if (
                    state.value
                      .videoTrack ===
                    track
                  ) {
                    state.value.videoTrack =
                      null
                  }
                },
              )
            }
          },
        )
      } catch (e) {
        // TODO
        state.value.error = String(e)
      }
    },
  )
  watch(
    () => state.value.cameraEnabled,
    (val) => {
      if (state.value.videoTrack) {
        state.value.videoTrack.enabled =
          val
      }
    },
  )
  watch(
    () => state.value.micEnabled,
    (val) => {
      if (state.value.audioTrack) {
        state.value.audioTrack.enabled =
          val
      }
    },
  )

  // TODO readonly?
  return state

  function closeTracks() {
    const s = state.value.stream
    if (s) {
      s.getTracks().forEach((t) => {
        s.removeTrack(t)
        t.stop()
      })
      state.value.stream = null
    }
    state.value.audioTrack = null
    state.value.videoTrack = null
  }

  async function updateDevicesList() {
    const devices =
      await navigator.mediaDevices.enumerateDevices()
    mediaDevices.value.cameraDevicesList =
      devices
        .filter(
          (d) =>
            d.kind === 'videoinput',
        )
        .map((d, i) => ({
          deviceId: d.deviceId,
          label:
            d.label ||
            `Camera ${i + 1}`,
          groupId: d.groupId,
        }))
    mediaDevices.value.micDevicesList =
      devices
        .filter(
          (d) =>
            d.kind === 'audioinput',
        )
        .map((d, i) => ({
          deviceId: d.deviceId,
          label:
            d.label ||
            `Microphone ${i + 1}`,
          groupId: d.groupId,
        }))
  }
}

function buildVideoConstraints(
  deviceId: string,
  constraints: MediaTrackConstraintSet,
): MediaTrackConstraintSet {
  const constr: MediaTrackConstraintSet =
    { ...constraints }
  if (deviceId) {
    constr.deviceId = {
      exact: deviceId,
    }
  }
  return constr
}

type VideoConstraints = {
  deviceId?: string
  width?: number
  height?: number
}

type AudioContraints = {
  deviceId?: string
}

function foldVideoConstraints(
  c: MediaTrackConstraintSet | boolean,
): string {
  if (typeof c === 'boolean') {
    return String(c)
  }
  const s = []
  if (c.deviceId) {
    s.push(
      `deviceId=${foldStringContraint(
        c.deviceId,
      )}`,
    )
  }
  if (c.width) {
    s.push(
      `width=${foldNumericConstraint(
        c.width,
      )}`,
    )
  }
  if (c.height) {
    s.push(
      `height=${foldNumericConstraint(
        c.height,
      )}`,
    )
  }
  return s.join('/') || 'true'
}

function foldAudioConstraints(
  c: MediaTrackConstraintSet | boolean,
) {
  if (typeof c === 'boolean') {
    return String(c)
  }
  const s = []
  if (c.deviceId) {
    s.push(
      `deviceId=${foldStringContraint(
        c.deviceId,
      )}`,
    )
  }
  return s.join('/') || 'true'
}

function foldNumericConstraint(
  c: ConstrainULong,
): string {
  if (typeof c === 'number') {
    return String(c)
  }
  // if (c.exact) {
  //   return c.exact
  // }
  if (c.ideal) {
    return String(c.ideal)
  }
  // TODO min, max?
  return ''
}

function foldStringContraint(
  c: ConstrainDOMString,
): string | boolean {
  if (typeof c === 'string') {
    return c
  }
  if (Array.isArray(c)) {
    return c[0] || ''
  }
  if (c.exact) {
    return fromMultiString(c.exact)
  }
  return false
}

function fromMultiString(
  c: string | string[],
): string | boolean {
  return typeof c === 'string'
    ? c
    : c.join(',')
}

function foldConstraints(c: {
  audio: MediaTrackConstraintSet | boolean
  video: MediaTrackConstraintSet | boolean
}) {
  return `audio:${foldAudioConstraints(
    c.audio,
  )}; video:${foldVideoConstraints(c.video)}`
}

// function sameConstraints(
//   a: {
//     video:
//       | boolean
//       | MediaTrackConstraintSet
//     audio:
//       | boolean
//       | MediaTrackConstraintSet
//   },
//   b: {
//     video:
//       | boolean
//       | MediaTrackConstraintSet
//     audio:
//       | boolean
//       | MediaTrackConstraintSet
//   },
// ) {
//   return (
//     foldVideoConstraints(a.video) ===
//       foldVideoConstraints(b.video) &&
//     foldAudioConstraints(a.audio) ===
//       foldAudioConstraints(b.audio)
//   )
// }
