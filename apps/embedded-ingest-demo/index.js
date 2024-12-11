import {
  LogTracer,
  Logger,
  IngesterErrorHandler,
  IngesterErrorReason,
  StreamMeta,
  VideoResolutionChangeDetector,
  WebrtcStreaming,
  WebrtcStreamingEvents,
  WhipClientEvents,
  setTracer,
  version,
} from '@gcorevideo/rtckit'

// Get the endpoint URL from the CCP
// Link path made of the integer stream ID and a token, which is a random hash value in hex format
const WHIP_ENDPOINT =
  'https://whip.gvideo.co/1960197_c58577f645c03d5b5c5dc1876c660bf5/whip'

Logger.enable('*')

document.addEventListener(
  'DOMContentLoaded',
  () => {
    setTracer(new LogTracer())
    document.getElementById('rtckitver').textContent = version
    let hasFatalError = false
    let whipClient = null;
    const videoElement =
      document.getElementById('preview')
    const previewPlate = document.getElementById('preview-plate')
    const statusNode =
      document.getElementById('status')
    const qualityNode = document.getElementById('videoquality')
    const webrtc = new WebrtcStreaming(
      WHIP_ENDPOINT,
      {
        canTrickleIce: true,
        debug: true,
        icePreferTcp: true,
        mediaDevicesAutoSwitch: true,
        mediaDevicesAutoSwitchRefresh: true,
        iceTransportPolicy: 'relay',
        plugins: [
          new IngesterErrorHandler((reason) => {
            setFatalError()
            showError(getIngesterErrorReasonExplanation(reason))
          }),
          new StreamMeta(),
          new VideoResolutionChangeDetector(({ degraded, height, srcHeight }) => {
            if (degraded) {
              qualityNode.textContent = `↓${height}p`
              qualityNode.style.color = 'red'
            } else {
              if (qualityNode.textContent === 'measuring...') {
                qualityNode.textContent = `${srcHeight}p`
              } else {
                qualityNode.textContent = `↑${srcHeight}p`
                qualityNode.style.color = 'green'
              }
            }
          }),
        ],
      }
    )

    webrtc.on(WebrtcStreamingEvents.MediaDeviceSelect, (e) => {
      switch (e.kind) {
        case "audio":
          micSelect.value = e.device.deviceId
          break
        case "video":
          cameraSelect.value = e.device.deviceId
          updateResolutionsList(e.device.deviceId)
          break
      }
    });

    webrtc.on(WebrtcStreamingEvents.MediaDeviceSwitch, (e) => {
      const kind = e.kind.slice(0, 1).toUpperCase() + e.kind.slice(1);
      const newStatus = `${kind} stream has been switched from "${e.prev.label}"(${e.prev.deviceId}) to "${e.device.label}"(${e.device.deviceId})`;
      showErrorTime(newStatus);
      setTimeout(refreshDevicesList, 0);
      // TODO check if needed
      runPreview();
    });

    webrtc.on(WebrtcStreamingEvents.MediaDeviceSwitchOff, (e) => {
      const msg = `"${e.device.label}"(${e.device.deviceId}) has disconnected`
      setTimeout(refreshDevicesList, 0)
      showError(msg)
    })

    function refreshDevicesList() {
      return updateDevicesList()
    }

    function setFatalError() {
      hasFatalError = true
      stop.hidden = true
      toggle.hidden = true
    }

    function showError(msg) {
      statusNode.textContent = msg
      statusNode.style.color = 'red'
    }

    const showErrorOnce = (function () {
      const shown = new Set();
      return function(msg) {
        if (shown.has(msg)) {
          return;
        }
        shown.add(msg);
        showError(msg);
      }
    })();

    function showStatus(msg) {
      statusNode.textContent = msg
      statusNode.style.color = ''
    }

    function showStatusIfNoError(msg) {
      if (statusNode.style.color !== 'red') {
        showStatus(msg)
      }
    }

    function showErrorTime(msg, time = 5000) {
      const prevMsg = statusNode.textContent
      const prevColor = statusNode.style.color
      showError(msg)
      setTimeout(() => {
        if (statusNode.textContent === msg) {
          statusNode.textContent = prevMsg
          statusNode.style.color = prevColor
        }
      }, time)
    }

    function getIngesterErrorReasonExplanation(code) {
      switch (code) {
        case IngesterErrorReason.StreamNotExists:
          return 'Stream does not exist'
        case IngesterErrorReason.StreamTokenInvalid:
          return 'Stream token is invalid'
        case IngesterErrorReason.DuplicateStream:
          return 'Someone else is already streaming'
      }
    }

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
    const micSelect = document.getElementById('mic')

    let active = true

    start.onclick = () => {
      startStreaming();
    }
    toggle.onclick = () => {
      active = !active
      webrtc.toggleVideo(active)
      webrtc.toggleAudio(active)
    }
    stop.onclick = () => {
      stop.hidden = true
      toggle.hidden = true
      webrtc.close()
      showStatus('Closed')
      whipClient = null
    }

    cameraSelect.onchange = () => {
      changeCameraDevice()
    }

    micOn.onchange = () => {
      micSelect.disabled = !micOn.checked
      micSelect.hidden = !micOn.checked
      requestMediaStream()
    }

    micSelect.onchange = () => {
      changeMicDevice()
    }

    videoresSelect.onchange = () => {
      changeVideoResolution()
    }

    updateDevicesList().then(() => {
      showStatusIfNoError('Ready')
    })


    function changeVideoResolution() {
      requestMediaStream();
    }

    function showOkStatus() {
      showStatus(whipClient ? 'Streaming' : 'Ready');
    }

    function requestMediaStream() {
      const deviceId = cameraSelect.value
      const resolution = Number(videoresSelect.value)

      showStatus('Reconnecting the devices...')

      start.disabled = true
      cameraSelect.disabled = true
      videoresSelect.disabled = true
      micSelect.disabled = true
      webrtc
        .openSourceStream({
          audio: micOn.checked ? micSelect.value : false,
          video: deviceId,
          resolution,
        }, false)
        .then(
          (s) => {
            showOkStatus()
            runPreview(s)
          },
          (e) => {
            showError(`Failed to open a device stream: ${e}`)
            if (e instanceof DOMException && e.name === "OverconstrainedError") {
              setTimeout(() => refreshDevicesList().then(() => {
                showOkStatus()
              }), 0);
            }
          },
        )
        .finally(() => {
          start.disabled = false
          cameraSelect.disabled = false
          micSelect.disabled = false
          videoresSelect.disabled = false
        })
    }

    function setEffectiveVideoResolution({ width, height }) {
      for (const item of webrtc.mediaDevices.getAvailableVideoResolutions(cameraSelect.value)) {
        if (item.height === height && item.width === width) {
          videoresSelect.value = String(item.height)
          return
        }
      }
      videoresSelect.value = ''
    }

    function changeCameraDevice() {
      updateResolutionsList(cameraSelect.value)
      requestMediaStream()
    }

    function changeMicDevice() {
      requestMediaStream();
    }

    function updateDevicesList() {
      return webrtc.mediaDevices
        .getCameras()
        .then((items) => {
          populateDevicesList(cameraSelect, items)
          cameraSelect.hidden = false
          cameraSelect.disabled = false
          if (items.length) {
            updateResolutionsList((cameraSelect.value || items[0].deviceId))
          }
        })
        .then(() => webrtc.mediaDevices.getMicrophones())
        .then((items) => {
          populateDevicesList(micSelect, items)
          if (!items.length) {
            micOn.checked = false;
            micOn.disabled = true;
            showErrorOnce('No microphones found')
          } else {
            micOn.disabled = false
          }
          micSelect.hidden = !micOn.checked
          micSelect.disabled = !micOn.checked
        })
        .then(() => runPreview())
    }

    function populateDevicesList(selectEl, items) {
      const currentValue = selectEl.value || items[0]?.deviceId
      selectEl.innerHTML = ''
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
        selectEl.appendChild(
          option,
        )
        if (item.deviceId === currentValue) {
          selectEl.value = currentValue
        }
      }
    }

    function updateResolutionsList(deviceId) {
      const items = webrtc.mediaDevices
        .getAvailableVideoResolutions(deviceId);
      const curValue = String(videoresSelect.value || items[0].height);
      videoresSelect.innerHTML = ''
      const defaultOption = document.createElement('option')
      defaultOption.value = ''
      defaultOption.textContent = 'Default'
      defaultOption.disabled = true
      videoresSelect.appendChild(defaultOption)
      let hasValue = false
      for (const item of items) {
        const option =
          document.createElement(
            'option',
          )
        const val = String(item.height)
        option.value = val
        if (val === curValue) {
          hasValue = true
        }
        option.textContent =
          item.width + '×' + item.height
        videoresSelect.appendChild(
          option,
        )
      }
      videoresSelect.hidden = false
      videoresSelect.disabled = false
      if (hasValue) {
        videoresSelect.value = curValue
      }
    }

    async function runPreview(stream) {
      const constraints = {
        audio: micOn.checked ? micSelect.value : false,
        video: cameraSelect.value,
        resolution: Number(videoresSelect.value),
      }
      const s = stream || await webrtc.openSourceStream(constraints)
      await webrtc.preview(videoElement)
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
      const resolution = Number(videoresSelect.value)

      showStatus('Connecting the devices...')
      webrtc
        .openSourceStream({
          audio: micOn.checked ? micSelect.value : false,
          video: cameraSelect.value,
          resolution,
        })
        .catch((e) => {
          if (e instanceof DOMException) {
            if (e.name === "NotReadableError") {
              showError('Failed to open a device stream: The camera is already in use')
              return Promise.reject(e)
            }
            if (e.name === "NotAllowedError") {
              showError('Failed to open a device stream: Permission denied')
              return Promise.reject(e)
            }
            // TODO handle other cases
            // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#exceptions
          }
          showError(`Failed to open a device stream: ${e}`)
          return Promise.reject(e)
        })
        .finally(() => {
          cameraSelect.disabled = false
        })
        .then((s) => runPreview(s))
        .then(() => webrtc.run())
        .then((wc) => {
          whipClient = wc
          showStatus('Connecting...')
          stop.hidden = false
          toggle.hidden = false
          qualityNode.textContent = 'measuring...'
          wc.on(WhipClientEvents.Connected, () => {
            hasFatalError = false
            showStatus('Streaming')
          })
          wc.on(WhipClientEvents.Disconnected, () => {
            showError('Disconnected')
          })
          wc.on(WhipClientEvents.ConnectionFailed, () => {
            // the client has already tried to reconnect
            if (!hasFatalError) {
              showError('Disconnected')
              setFatalError()
            }
          })
        },
        (e) => {
          if (!IngesterErrorHandler.isIngesterError(e)) {
            showError(`Failed to start streaming: ${e}`)
          }
        },
      )
    }
  },
)
