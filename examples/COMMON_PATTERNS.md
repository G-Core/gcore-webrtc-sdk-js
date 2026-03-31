# Common Patterns - Gcore WebRTC SDK

**Copy-paste code patterns** for common tasks. Use these with AI to quickly build features.

**Need help using these with AI?** See [AI_DEVELOPMENT_GUIDE.md](../AI_DEVELOPMENT_GUIDE.md) for prompting strategies.

---

## Device Management {#device-management}

### Pattern: Get List of Cameras

```javascript
import { WebrtcStreaming } from '@gcorevideo/rtckit';

const webrtc = new WebrtcStreaming('https://whip.gvideo.co/STREAM/whip');

// Get cameras (returns array of MediaInputDeviceInfo)
const cameras = await webrtc.mediaDevices.getCameras();

cameras.forEach(camera => {
  console.log(`Camera: ${camera.label} (ID: ${camera.deviceId})`);
});
```

**Ask AI**: "Populate a dropdown with this camera list"

---

### Pattern: Get List of Microphones

```javascript
const mics = await webrtc.mediaDevices.getMicrophones();

mics.forEach(mic => {
  console.log(`Microphone: ${mic.label} (ID: ${mic.deviceId})`);
});
```

---

### Pattern: Check Supported Resolutions

```javascript
const deviceId = 'camera-device-id-here';

const resolutions = await webrtc.mediaDevices.getAvailableVideoResolutions(deviceId);

resolutions.forEach(res => {
  console.log(`${res.width}x${res.height}`);
});

// Use the highest available
const highest = resolutions[0];
await webrtc.openSourceStream({
  video: deviceId,
  resolution: highest.height,
});
```

**Ask AI**: "Show only resolutions this camera supports in the dropdown"

---

### Pattern: Refresh Device List

```javascript
// After user plugs/unplugs devices
document.getElementById('refreshBtn').onclick = () => {
  webrtc.mediaDevices.reset();  // Clear cache
  loadDevices();  // Reload your UI
};
```

---

### Pattern: Request Permission First

```javascript
async function requestPermissions() {
  try {
    // Request access to get device labels
    await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    // Now getCameras() will have labels
    const cameras = await webrtc.mediaDevices.getCameras();
    return cameras;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      alert('Please allow camera access');
    }
    throw error;
  }
}
```

**Ask AI**: "Show a permission prompt UI before this function"

---

## Error Handling {#error-handling}

### Pattern: Handle getUserMedia Errors

```javascript
try {
  const stream = await webrtc.openSourceStream({
    video: true,
    audio: true,
  });
} catch (error) {
  switch (error.name) {
    case 'NotAllowedError':
      showError('Camera/microphone permission denied');
      break;

    case 'NotFoundError':
      showError('No camera or microphone found');
      break;

    case 'NotReadableError':
      showError('Camera is in use by another app');
      break;

    case 'OverconstrainedError':
      showError('Selected resolution not supported');
      break;

    default:
      showError(`Error: ${error.message}`);
  }
}
```

**Ask AI**: "Add retry logic to this error handler"

---

### Pattern: Handle Streaming Errors with Plugin

```javascript
import {
  WebrtcStreaming,
  IngesterErrorHandler,
  IngesterErrorReason,
} from '@gcorevideo/rtckit';

const webrtc = new WebrtcStreaming(whipUrl, {
  plugins: [
    new IngesterErrorHandler((reason) => {
      switch (reason) {
        case IngesterErrorReason.StreamNotExists:
          showError('Stream does not exist');
          break;

        case IngesterErrorReason.StreamTokenInvalid:
          showError('Invalid stream token');
          break;

        case IngesterErrorReason.DuplicateStream:
          showError('Someone else is already streaming');
          break;
      }
    }),
  ],
});
```

---

### Pattern: Handle Connection Events

```javascript
const whipClient = await webrtc.run();

whipClient.on('connected', () => {
  console.log('Streaming started');
  updateUI('streaming');
});

whipClient.on('disconnected', () => {
  console.log('Connection lost, reconnecting...');
  updateUI('reconnecting');
});

whipClient.on('connection_failed', () => {
  console.log('Reconnection failed');
  updateUI('failed');
  webrtc.close();
});
```

**Ask AI**: "Add a retry counter UI that shows reconnection attempts"

---

### Pattern: Graceful Shutdown

```javascript
// Clean up before page unload
window.addEventListener('beforeunload', () => {
  if (webrtc) {
    webrtc.close();
  }
});

// Or with confirmation
window.addEventListener('beforeunload', (e) => {
  if (isStreaming) {
    e.preventDefault();
    e.returnValue = 'You are currently streaming. Are you sure you want to leave?';
  }
});
```

---

## Streaming Control {#streaming-control}

### Pattern: Basic Start/Stop

```javascript
let webrtc = null;
let whipClient = null;

async function startStreaming() {
  webrtc = new WebrtcStreaming(whipUrl);

  const stream = await webrtc.openSourceStream({
    video: true,
    audio: true,
    resolution: 720,
  });

  await webrtc.preview(videoElement);
  whipClient = await webrtc.run();
}

function stopStreaming() {
  webrtc.close();
  webrtc = null;
  whipClient = null;
}
```

---

### Pattern: Toggle Audio/Video

```javascript
// Mute/unmute audio
let audioEnabled = true;

document.getElementById('muteBtn').onclick = () => {
  audioEnabled = !audioEnabled;
  webrtc.toggleAudio(audioEnabled);
};

// Disable/enable video (black screen, but keeps connection)
let videoEnabled = true;

document.getElementById('videoBtn').onclick = () => {
  videoEnabled = !videoEnabled;
  webrtc.toggleVideo(videoEnabled);
};
```

**Ask AI**: "Add icons to these buttons (🔊/🔇, 📹/🚫)"

---

### Pattern: Change Resolution During Streaming

```javascript
async function changeResolution(newResolution) {
  // Reopen stream with new resolution
  const stream = await webrtc.openSourceStream({
    video: currentCameraId,
    audio: currentMicId,
    resolution: newResolution,
  });

  // Preview updates automatically
  // Streaming continues with new resolution
}
```

---

### Pattern: Switch Camera During Streaming

```javascript
async function switchCamera(newDeviceId) {
  const stream = await webrtc.openSourceStream({
    video: newDeviceId,
    audio: currentMicId,
    resolution: currentResolution,
  });

  // SDK handles track replacement automatically
  await webrtc.preview(videoElement);
}
```

---

## Advanced Features {#advanced-features}

### Pattern: Monitor Video Quality

```javascript
import { VideoResolutionChangeDetector } from '@gcorevideo/rtckit';

const webrtc = new WebrtcStreaming(whipUrl, {
  plugins: [
    new VideoResolutionChangeDetector(({ degraded, height, srcHeight }) => {
      if (degraded) {
        console.log(`Quality dropped to ${height}p from ${srcHeight}p`);
        showQualityWarning(height);
      } else {
        console.log(`Quality restored to ${srcHeight}p`);
        hideQualityWarning();
      }
    }),
  ],
});
```

**Ask AI**: "Add a quality indicator badge that shows current resolution"

---

### Pattern: Auto Device Switching

```javascript
const webrtc = new WebrtcStreaming(whipUrl, {
  mediaDevicesAutoSwitch: true,  // Enable auto-switching
});

// Listen for device switches
webrtc.on('mdswitch', (event) => {
  console.log(`${event.kind} switched:`);
  console.log(`From: ${event.prev.label}`);
  console.log(`To: ${event.device.label}`);

  showNotification(`Switched to ${event.device.label}`);
});

// Listen for device disconnects
webrtc.on('mdswitchoff', (event) => {
  console.log(`${event.kind} disconnected: ${event.device.label}`);
  showError(`Device disconnected: ${event.device.label}`);
});
```

---

### Pattern: Custom Metadata

```javascript
import { StreamMeta } from '@gcorevideo/rtckit';

const metadata = new StreamMeta();

// Set initial metadata
metadata.init({
  userId: '12345',
  streamTitle: 'My Awesome Stream',
  customField: 'value',
});

const webrtc = new WebrtcStreaming(whipUrl, {
  plugins: [metadata],
});

// Update metadata during streaming
metadata.request({
  viewers: 150,
  timestamp: Date.now(),
});
```

**Ask AI**: "Add a form to let users set stream title before starting"

---

### Pattern: Debug Logging

```javascript
import { Logger, LogTracer, setTracer } from '@gcorevideo/rtckit';

// Enable SDK logging
setTracer(new LogTracer());
Logger.enable('*');  // Enable all logs

const webrtc = new WebrtcStreaming(whipUrl, {
  debug: true,  // Enable WHIP client debug logs
});

// In production, disable logs:
// Logger.disable();
```

---

## UI Patterns {#ui-patterns}

### Pattern: Status Indicator

```javascript
const statusElement = document.getElementById('status');

function updateStatus(state) {
  const states = {
    idle: { text: 'Ready', color: '#999' },
    connecting: { text: 'Connecting...', color: '#ff9800' },
    streaming: { text: '🔴 Live', color: '#4caf50' },
    reconnecting: { text: 'Reconnecting...', color: '#ff9800' },
    error: { text: 'Error', color: '#f44336' },
  };

  const { text, color } = states[state];
  statusElement.textContent = text;
  statusElement.style.color = color;
}

// Usage
updateStatus('connecting');
whipClient.on('connected', () => updateStatus('streaming'));
whipClient.on('disconnected', () => updateStatus('reconnecting'));
```

**Ask AI**: "Make this a reusable component"

---

### Pattern: Streaming Timer

```javascript
let streamStartTime = null;
let timerInterval = null;

function startTimer() {
  streamStartTime = Date.now();

  timerInterval = setInterval(() => {
    const elapsed = Date.now() - streamStartTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const display = [
      hours.toString().padStart(2, '0'),
      (minutes % 60).toString().padStart(2, '0'),
      (seconds % 60).toString().padStart(2, '0'),
    ].join(':');

    document.getElementById('timer').textContent = display;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  streamStartTime = null;
}

// Usage
whipClient.on('connected', startTimer);
stopBtn.onclick = () => {
  stopStreaming();
  stopTimer();
};
```

---

### Pattern: Quality Indicator Badge

```javascript
<style>
  .quality-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 5px 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border-radius: 4px;
    font-size: 12px;
  }
  .quality-badge.good { background: rgba(76, 175, 80, 0.8); }
  .quality-badge.degraded { background: rgba(244, 67, 54, 0.8); }
</style>

<div class="video-container">
  <video id="preview"></video>
  <div id="qualityBadge" class="quality-badge good">720p</div>
</div>

<script>
  const qualityBadge = document.getElementById('qualityBadge');

  new VideoResolutionChangeDetector(({ degraded, height }) => {
    qualityBadge.textContent = `${height}p`;
    qualityBadge.className = degraded
      ? 'quality-badge degraded'
      : 'quality-badge good';
  });
</script>
```

---

### Pattern: Device Selector Dropdown

```javascript
async function populateDeviceDropdown(selectElement, devices) {
  selectElement.innerHTML = '';

  if (devices.length === 0) {
    const option = document.createElement('option');
    option.textContent = 'No devices found';
    option.disabled = true;
    selectElement.appendChild(option);
    selectElement.disabled = true;
    return;
  }

  devices.forEach((device, index) => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || `Device ${index + 1}`;
    selectElement.appendChild(option);
  });

  selectElement.disabled = false;
}

// Usage
const cameras = await webrtc.mediaDevices.getCameras();
populateDeviceDropdown(document.getElementById('cameraSelect'), cameras);
```

**Ask AI**: "Style this dropdown with custom CSS"

---

## Server-Side Patterns {#server-side}

### Pattern: Create Stream Endpoint

```javascript
// Node.js + Express
import { ApiKey, GcoreApi } from '@gcorevideo/rtckit-node';

const api = new GcoreApi(new ApiKey(process.env.GCORE_API_KEY));

app.post('/api/streams', async (req, res) => {
  try {
    const { name } = req.body;
    const stream = await api.webrtc.createStream(name);

    res.json({
      id: stream.id,
      whipUrl: stream.whipUrl,
      whepUrl: stream.whepUrl,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### Pattern: Stream Cleanup

```javascript
// Delete stream after streaming ends
app.delete('/api/streams/:id', async (req, res) => {
  try {
    const streamId = parseInt(req.params.id);
    await api.webrtc.deleteStream(streamId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Client-side cleanup
stopBtn.onclick = async () => {
  webrtc.close();

  // Delete stream on server
  await fetch(`/api/streams/${currentStreamId}`, {
    method: 'DELETE',
  });
};
```

---

### Pattern: List Active Streams

```javascript
app.get('/api/streams', async (req, res) => {
  try {
    const streams = await api.webrtc.listStreams();

    // Filter active streams
    const active = streams.filter(s => s.active);

    res.json(active);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### Pattern: Environment Config

```javascript
// config.js
export const config = {
  gcoreApiKey: process.env.GCORE_API_KEY,
  gcoreApiHost: process.env.GCORE_API_HOST || 'https://api.gcore.com',
  port: process.env.PORT || 3000,
};

// Validate required env vars
if (!config.gcoreApiKey) {
  throw new Error('GCORE_API_KEY environment variable is required');
}
```

---

## Testing Patterns {#testing}

### Pattern: Mock getUserMedia

```javascript
// For testing without real camera
const mockStream = {
  getTracks: () => [
    {
      kind: 'video',
      id: 'mock-video-track',
      enabled: true,
      stop: () => {},
    },
  ],
  getVideoTracks: () => [/* ... */],
  getAudioTracks: () => [],
};

// Override getUserMedia
navigator.mediaDevices.getUserMedia = async () => mockStream;
```

---

### Pattern: Simulate Device Changes

```javascript
// Test auto-switching
function simulateDeviceDisconnect() {
  const track = stream.getVideoTracks()[0];
  track.dispatchEvent(new Event('ended'));
}

setTimeout(simulateDeviceDisconnect, 5000);  // Disconnect after 5s
```

---

## Performance Patterns {#performance}

### Pattern: Lazy Load SDK

```javascript
let WebrtcStreaming = null;

async function loadSDK() {
  if (!WebrtcStreaming) {
    const module = await import('https://rtckit.gvideo.io/0.89.12/index.esm.js');
    WebrtcStreaming = module.WebrtcStreaming;
  }
  return WebrtcStreaming;
}

// Load only when needed
startBtn.onclick = async () => {
  const SDK = await loadSDK();
  const webrtc = new SDK(whipUrl);
  // ...
};
```

---

### Pattern: Debounce Device Changes

```javascript
let deviceChangeTimeout = null;

function debounce(fn, delay) {
  return (...args) => {
    clearTimeout(deviceChangeTimeout);
    deviceChangeTimeout = setTimeout(() => fn(...args), delay);
  };
}

cameraSelect.onchange = debounce(async () => {
  await switchCamera(cameraSelect.value);
}, 500);  // Wait 500ms after user stops changing
```

---

## Next Steps

**Ask AI to**:
- Combine multiple patterns
- Adapt patterns to your framework (React, Vue, etc.)
- Add features to patterns
- Simplify patterns for your use case

**Example prompt**:
```
"Take the 'Device Selector Dropdown' pattern and
'Auto Device Switching' pattern and combine them
into a React component"
```
