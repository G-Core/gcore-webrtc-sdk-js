import { WebrtcStreaming } from '@gcorevideo/rtckit/lib/whip'

// Get the endpoint URL from the CCP
// Link path made of the integer stream ID and a token, which is a random hash value in hex format
const WHIP_ENDPOINT =
  'https://whip.gvideo.co/1960197_c58577f645c03d5b5c5dc1876c660bf5/whip'


document.addEventListener(
  'DOMContentLoaded',
  () => {
    const videoElement =
      document.getElementById('preview')
    const previewPlate = document.getElementById('preview-plate')
    const statusNode =
      document.getElementById('status')
    const webrtc = new WebrtcStreaming(
      WHIP_ENDPOINT,
      {
        iceServers: [{
          urls: "stun:ed-c16-95-128-175.fe.gc.onl",
        }],
      }
    )
    const start =
      document.getElementById('start')
    const stop =
      document.getElementById('stop')
    const toggle =
      document.getElementById('toggle')
    const cameraSelect =
      document.getElementById('camera')
    const micOn =
      document.getElementById('audio')
    const videoresSelect = document.getElementById('videores')

    start.onclick = () => {
      startStreaming();
    }
    let active = true
    toggle.onclick = () => {
      active = !active
      webrtc.toggleVideo(active)
      webrtc.toggleAudio(active)
    }
    stop.onclick = () => {
      stop.hidden = true
      toggle.hidden = true
      webrtc.close()
      statusNode.textContent = 'Closed'
    }

    cameraSelect.onchange = () => {
      changeCameraDevice()
    }

    videoresSelect.onchange = () => {
      changeVideoResolution()
    }

    updateDevicesList()

    function changeVideoResolution() {
      requestVideoStream();
    }

    function requestVideoStream() {
      const deviceId = cameraSelect.value
      const resolution = Number(videoresSelect.value)
      statusNode.textContent =
        'Reconnecting the devices...'
      start.disabled = true
      cameraSelect.disabled = true
      videoresSelect.disabled = true
      webrtc
        .openSourceStream({
          video: deviceId,
          resolution,
        })
        .then(
          (s) => {
            statusNode.textContent =
              'Ready'
            runPreview()
          },
          (e) => {
            statusNode.textContent = `Failed to open a device stream: ${e}`
          },
        )
        .finally(() => {
          start.disabled = false
          cameraSelect.disabled = false
          videoresSelect.disabled = false
        })
    }

    function setEffectiveVideoResolution({ width, height }) {
      for (const item of webrtc.mediaDevices.getAvailableVideoResolutions(cameraSelect.value)) {
        if (item.height === height && item.width === width) {
          videoresSelect.value = item.height
          return
        }
      }
      videoresSelect.value = ''
    }

    function changeCameraDevice() {
      updateResolutionsList(cameraSelect.value)
      requestVideoStream()
    }

    function updateDevicesList() {
      webrtc.mediaDevices
          .getCameras()
          .then((items) => {
            for (const item of items) {
              const option =
                document.createElement(
                  'option',
                )
              option.value =
                item.deviceId
              option.textContent =
                item.label ||
                item.deviceId
              cameraSelect.appendChild(
                option,
              )
            }
            cameraSelect.hidden = false
            cameraSelect.disabled = false
            micOn.disabled = false
            if (items.length) {
              updateResolutionsList(items[0].deviceId)
            }
            statusNode.textContent =
              'Ready'
          })
          .then(() => runPreview())
    }

    function updateResolutionsList(deviceId) {
      const items =  webrtc.mediaDevices
        .getAvailableVideoResolutions(deviceId);
      videoresSelect.innerHTML = ''
      const defaultOption = document.createElement('option')
      defaultOption.value = ''
      defaultOption.textContent = 'Default'
      defaultOption.disabled = true
      videoresSelect.appendChild(defaultOption)
      for (const item of items) {
        const option =
          document.createElement(
            'option',
          )
        option.value =
          item.height
        option.textContent =
          item.width + '×' + item.height
        videoresSelect.appendChild(
          option,
        )
      }
      videoresSelect.hidden = false
      videoresSelect.disabled = false
    }

    async function runPreview() {
      await webrtc.preview(videoElement)
      const s = await webrtc.openSourceStream()
      const t = s.getVideoTracks()[0]
      if (t) {
        const settings = t.getSettings()
        updatePreviewPlate(settings)
        setEffectiveVideoResolution(settings)
      }
    }

    async function updatePreviewPlate({ width, height }) {
      previewPlate.textContent = `${width}×${height}`
    }

    function startStreaming() {
      start.hidden = true
      cameraSelect.disabled = true
      micOn.disabled = true
      const resolution = Number(videoresSelect.value)
      webrtc
        .openSourceStream({
          audio: !!micOn.checked,
          video: cameraSelect.value,
          resolution,
        })
        .catch((e) => {
          if (e instanceof DOMException) {
            if (e.name === "NotReadableError") {
              statusNode.textContent =
                'Failed to open a device stream: The camera is already in use'
              return
            }
            if (e.name === "NotAllowedError") {
              statusNode.textContent =
                'Failed to open a device stream: Permission denied'
              return
            }
            // TODO handle other cases
            // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#exceptions
          }
          statusNode.textContent = `Failed to open a device stream: ${e}`
        })
        .finally(() => {
          cameraSelect.disabled = false
        })
      statusNode.textContent =
        'Connecting the devices...'
      runPreview()
      webrtc.run().then(
        () => {
          statusNode.textContent =
            'Streaming'
          stop.hidden = false
          toggle.hidden = false
        },
        (e) => {
          statusNode.textContent = `Failed to start streaming: ${e}`
        },
      )
    }
  },
)
