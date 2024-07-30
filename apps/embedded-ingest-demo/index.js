import { WebrtcStreaming } from '@gcorevideo/rtckit/lib/whip'

// Get the endpoint URL from the CCP
// Link path made of the integer stream ID and a token, which is a random hash value in hex format
const WHIP_ENDPOINT =
  'https://whip.preprod.gvideo.co/7144575_d99d58f644d4cc55cca16c97000dda71/whip'


document.addEventListener(
  'DOMContentLoaded',
  () => {
    const videoElement =
      document.getElementById('preview')
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
      changeCameraDevice();
    }

    updateDevicesList();

    function changeCameraDevice() {
      const deviceId =
        cameraSelect.value
      statusNode.textContent =
        'Reconnecting the devices...'
      start.disabled = true
      console.log(
        'onCameraSelect deviceId:%s',
        deviceId,
      )
      webrtc
        .openSourceStream({
          video: deviceId,
        })
        .then(
          () => {
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
        })
    }

    function updateDevicesList() {
      webrtc
      .openSourceStream()
      .then(() => {
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
            statusNode.textContent =
              'Ready'
          })
          .then(() => runPreview())
      })
    }

    function runPreview() {
      webrtc.preview(videoElement)
    }

    function startStreaming() {
      start.hidden = true
      cameraSelect.disabled = true
      micOn.disabled = true
      console.log(
        'onStart micOn:%s',
        micOn.checked,
      )
      webrtc
        .openSourceStream({
          audio: !!micOn.checked,
          video: cameraSelect.value,
          resolution: 1080,
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
