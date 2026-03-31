# AI Usage Examples - Gcore WebRTC SDK

**Complete, runnable code examples** for building with Gcore WebRTC SDK using AI assistance.

**How to use**: Copy any example → Ask AI to customize → Deploy

**New to AI-assisted development?** Start with [AI_DEVELOPMENT_GUIDE.md](../AI_DEVELOPMENT_GUIDE.md) for prompting strategies and tips.

---

## Example 1: Basic Streaming Setup {#basic-streaming-setup}

**What it does**: Minimal streaming page with start/stop buttons

**AI Prompt**:
```
"Use this code as a starting point and customize [describe change]"
```

### Complete Code

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Basic Streaming</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; }
    video { width: 100%; max-width: 640px; background: #000; }
    button { padding: 10px 20px; margin: 5px; font-size: 16px; }
    #status { margin: 10px 0; padding: 10px; background: #f0f0f0; }
    .error { background: #ffebee; color: #c62828; }
    .success { background: #e8f5e9; color: #2e7d32; }
  </style>
</head>
<body>
  <h1>Basic Streaming</h1>
  <video id="preview" autoplay muted playsinline></video>
  <div>
    <button id="start">Start Streaming</button>
    <button id="stop" hidden>Stop Streaming</button>
  </div>
  <div id="status">Loading...</div>

  <script type="module">
    import { WebrtcStreaming } from 'https://rtckit.gvideo.io/0.89.12/index.esm.js';

    // REPLACE THIS with your actual WHIP endpoint
    const WHIP_ENDPOINT = 'https://whip.gvideo.co/YOUR_STREAM_ID_TOKEN/whip';

    const videoElement = document.getElementById('preview');
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');
    const statusDiv = document.getElementById('status');

    let webrtc = null;
    let whipClient = null;

    // Initialize SDK
    webrtc = new WebrtcStreaming(WHIP_ENDPOINT, {
      videoCodecs: ['H264'],
      mediaDevicesAutoSwitch: true,
    });

    // Update UI status
    function setStatus(message, isError = false) {
      statusDiv.textContent = message;
      statusDiv.className = isError ? 'error' : 'success';
    }

    // Start streaming
    startBtn.onclick = async () => {
      try {
        setStatus('Opening camera and microphone...');

        // Get media stream
        const stream = await webrtc.openSourceStream({
          audio: true,
          video: true,
          resolution: 720,
        });

        // Show preview
        await webrtc.preview(videoElement);
        setStatus('Connecting to Gcore...');

        // Start streaming
        whipClient = await webrtc.run();

        // Handle connection events
        whipClient.on('connected', () => {
          setStatus('✓ Streaming live');
          startBtn.hidden = true;
          stopBtn.hidden = false;
        });

        whipClient.on('disconnected', () => {
          setStatus('Reconnecting...', true);
        });

        whipClient.on('connection_failed', () => {
          setStatus('Connection failed', true);
          stopBtn.click(); // Stop streaming
        });

      } catch (error) {
        console.error('Streaming error:', error);

        if (error.name === 'NotAllowedError') {
          setStatus('Camera/microphone permission denied', true);
        } else if (error.name === 'NotFoundError') {
          setStatus('No camera or microphone found', true);
        } else {
          setStatus(`Error: ${error.message}`, true);
        }
      }
    };

    // Stop streaming
    stopBtn.onclick = () => {
      webrtc.close();
      whipClient = null;
      videoElement.srcObject = null;

      startBtn.hidden = false;
      stopBtn.hidden = true;
      setStatus('Stopped');
    };

    // Initial status
    setStatus('Ready to stream');
  </script>
</body>
</html>
```

### Validation Steps
1. Open in browser
2. Replace `WHIP_ENDPOINT` with your actual endpoint
3. Click "Start Streaming"
4. Allow camera/microphone permissions
5. See preview and "Streaming live" status

### Common Customizations to Ask AI

**Add audio mute**:
```
"Add a mute button that toggles audio without stopping the stream"
```

**Change resolution**:
```
"Change default resolution to 1080p"
```

**Add timer**:
```
"Show how long I've been streaming (MM:SS format)"
```

---

## Example 2: Device Selection {#device-selection}

**What it does**: Camera and microphone dropdowns with live switching

**AI Prompt**:
```
"Add resolution selector to this device selection code"
```

### Complete Code

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Device Selection</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; }
    video { width: 100%; max-width: 640px; background: #000; margin-bottom: 20px; }
    .controls { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
    .control-row { display: flex; align-items: center; gap: 10px; }
    label { min-width: 100px; }
    select { flex: 1; padding: 5px; }
    button { padding: 10px 20px; font-size: 16px; }
    #status { padding: 10px; background: #f0f0f0; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>Device Selection</h1>
  <video id="preview" autoplay muted playsinline></video>

  <div class="controls">
    <div class="control-row">
      <label>Camera:</label>
      <select id="camera"></select>
    </div>
    <div class="control-row">
      <label>Microphone:</label>
      <select id="microphone"></select>
      <label><input type="checkbox" id="audioEnabled" checked> Enable audio</label>
    </div>
    <div class="control-row">
      <label>Resolution:</label>
      <select id="resolution">
        <option value="240">240p</option>
        <option value="360">360p</option>
        <option value="480">480p</option>
        <option value="720" selected>720p</option>
        <option value="1080">1080p</option>
      </select>
    </div>
  </div>

  <button id="start">Start Streaming</button>
  <button id="stop" hidden>Stop Streaming</button>
  <div id="status">Loading devices...</div>

  <script type="module">
    import { WebrtcStreaming } from 'https://rtckit.gvideo.io/0.89.12/index.esm.js';

    const WHIP_ENDPOINT = 'https://whip.gvideo.co/YOUR_STREAM_ID_TOKEN/whip';

    const videoElement = document.getElementById('preview');
    const cameraSelect = document.getElementById('camera');
    const micSelect = document.getElementById('microphone');
    const audioCheckbox = document.getElementById('audioEnabled');
    const resolutionSelect = document.getElementById('resolution');
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');
    const statusDiv = document.getElementById('status');

    let webrtc = null;
    let whipClient = null;
    let isStreaming = false;

    // Initialize SDK
    webrtc = new WebrtcStreaming(WHIP_ENDPOINT, {
      videoCodecs: ['H264'],
      mediaDevicesAutoSwitch: true,
    });

    // Update status
    function setStatus(message) {
      statusDiv.textContent = message;
    }

    // Populate camera dropdown
    async function loadCameras() {
      const cameras = await webrtc.mediaDevices.getCameras();
      cameraSelect.innerHTML = '';

      cameras.forEach(camera => {
        const option = document.createElement('option');
        option.value = camera.deviceId;
        option.textContent = camera.label || `Camera ${cameras.indexOf(camera) + 1}`;
        cameraSelect.appendChild(option);
      });

      return cameras.length > 0;
    }

    // Populate microphone dropdown
    async function loadMicrophones() {
      const mics = await webrtc.mediaDevices.getMicrophones();
      micSelect.innerHTML = '';

      mics.forEach(mic => {
        const option = document.createElement('option');
        option.value = mic.deviceId;
        option.textContent = mic.label || `Microphone ${mics.indexOf(mic) + 1}`;
        micSelect.appendChild(option);
      });

      if (mics.length === 0) {
        audioCheckbox.checked = false;
        micSelect.disabled = true;
      }

      return mics.length > 0;
    }

    // Open stream with current settings
    async function openStream() {
      const params = {
        video: cameraSelect.value || true,
        audio: audioCheckbox.checked ? (micSelect.value || true) : false,
        resolution: parseInt(resolutionSelect.value),
      };

      const stream = await webrtc.openSourceStream(params);
      await webrtc.preview(videoElement);

      return stream;
    }

    // Load devices on page load
    async function init() {
      try {
        // Request initial permission to get device labels
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        await loadCameras();
        await loadMicrophones();
        await openStream();

        setStatus('Ready to stream');
      } catch (error) {
        console.error('Init error:', error);
        setStatus('Error loading devices');
      }
    }

    // Handle device changes
    cameraSelect.onchange = async () => {
      if (!isStreaming) {
        setStatus('Switching camera...');
        await openStream();
        setStatus('Ready to stream');
      } else {
        setStatus('Reconnecting with new camera...');
        await openStream();
        setStatus('Streaming with new camera');
      }
    };

    micSelect.onchange = async () => {
      if (isStreaming) {
        setStatus('Reconnecting with new microphone...');
        await openStream();
        setStatus('Streaming with new microphone');
      }
    };

    audioCheckbox.onchange = async () => {
      if (isStreaming) {
        await openStream();
      }
    };

    resolutionSelect.onchange = async () => {
      setStatus('Changing resolution...');
      await openStream();
      setStatus(isStreaming ? 'Streaming' : 'Ready to stream');
    };

    // Start streaming
    startBtn.onclick = async () => {
      try {
        setStatus('Connecting...');

        whipClient = await webrtc.run();
        isStreaming = true;

        whipClient.on('connected', () => {
          setStatus('✓ Streaming live');
          startBtn.hidden = true;
          stopBtn.hidden = false;
        });

        whipClient.on('disconnected', () => {
          setStatus('Reconnecting...');
        });

        whipClient.on('connection_failed', () => {
          setStatus('Connection failed');
          stopBtn.click();
        });

      } catch (error) {
        console.error('Streaming error:', error);
        setStatus(`Error: ${error.message}`);
        isStreaming = false;
      }
    };

    // Stop streaming
    stopBtn.onclick = () => {
      webrtc.close();
      whipClient = null;
      isStreaming = false;

      startBtn.hidden = false;
      stopBtn.hidden = true;
      setStatus('Stopped');
    };

    // Initialize
    init();
  </script>
</body>
</html>
```

### Validation Steps
1. See populated camera/microphone dropdowns
2. Preview shows selected camera
3. Change devices → preview updates
4. Start streaming → works with selected devices

---

## Example 3: Error Handling & Plugins {#error-handling}

**What it does**: Robust error handling with user-friendly messages

**AI Prompt**:
```
"Add retry logic that attempts to reconnect 3 times before giving up"
```

### Complete Code

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Error Handling Demo</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; }
    video { width: 100%; max-width: 640px; background: #000; }
    button { padding: 10px 20px; margin: 5px; font-size: 16px; }
    .status { margin: 10px 0; padding: 10px; border-radius: 4px; }
    .status.error { background: #ffebee; color: #c62828; }
    .status.warning { background: #fff3e0; color: #ef6c00; }
    .status.success { background: #e8f5e9; color: #2e7d32; }
    .status.info { background: #e3f2fd; color: #1565c0; }
    #quality { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Error Handling Demo</h1>
  <video id="preview" autoplay muted playsinline></video>
  <div>
    <button id="start">Start Streaming</button>
    <button id="stop" hidden>Stop Streaming</button>
  </div>
  <div id="status" class="status info">Loading...</div>
  <div>Video quality: <span id="quality">-</span></div>

  <script type="module">
    import {
      WebrtcStreaming,
      IngesterErrorHandler,
      IngesterErrorReason,
      VideoResolutionChangeDetector,
    } from 'https://rtckit.gvideo.io/0.89.12/index.esm.js';

    const WHIP_ENDPOINT = 'https://whip.gvideo.co/YOUR_STREAM_ID_TOKEN/whip';

    const videoElement = document.getElementById('preview');
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');
    const statusDiv = document.getElementById('status');
    const qualitySpan = document.getElementById('quality');

    let webrtc = null;
    let whipClient = null;

    // Status helper
    function setStatus(message, type = 'info') {
      statusDiv.textContent = message;
      statusDiv.className = `status ${type}`;
    }

    // Initialize SDK with plugins
    webrtc = new WebrtcStreaming(WHIP_ENDPOINT, {
      videoCodecs: ['H264'],
      mediaDevicesAutoSwitch: true,
      debug: true,
      plugins: [
        // Handle ingester errors
        new IngesterErrorHandler((reason) => {
          console.error('Ingester error:', reason);

          let errorMessage = 'Streaming error';
          switch (reason) {
            case IngesterErrorReason.StreamNotExists:
              errorMessage = 'Stream does not exist. Check your WHIP endpoint.';
              break;
            case IngesterErrorReason.StreamTokenInvalid:
              errorMessage = 'Invalid stream token. Check your credentials.';
              break;
            case IngesterErrorReason.DuplicateStream:
              errorMessage = 'Someone else is already streaming to this endpoint.';
              break;
          }

          setStatus(errorMessage, 'error');
          setTimeout(() => stopBtn.click(), 2000);
        }),

        // Monitor video quality
        new VideoResolutionChangeDetector(({ degraded, height, srcHeight }) => {
          if (degraded) {
            qualitySpan.textContent = `↓ ${height}p (reduced from ${srcHeight}p)`;
            qualitySpan.style.color = 'red';
            setStatus('Video quality degraded due to network conditions', 'warning');
          } else {
            qualitySpan.textContent = `${srcHeight}p`;
            qualitySpan.style.color = 'green';
          }
        }),
      ],
    });

    // Handle media device changes
    webrtc.on('mdswitch', (e) => {
      console.log('Device switched:', e);
      setStatus(
        `${e.kind} device switched from "${e.prev?.label}" to "${e.device?.label}"`,
        'warning'
      );
    });

    webrtc.on('mdswitchoff', (e) => {
      console.log('Device disconnected:', e);
      setStatus(`${e.kind} device "${e.device?.label}" disconnected`, 'error');
    });

    // Start streaming
    startBtn.onclick = async () => {
      try {
        setStatus('Requesting camera and microphone access...', 'info');

        const stream = await webrtc.openSourceStream({
          audio: true,
          video: true,
          resolution: 720,
        });

        setStatus('Camera and microphone ready', 'success');
        await webrtc.preview(videoElement);

        setStatus('Connecting to Gcore servers...', 'info');
        whipClient = await webrtc.run();

        whipClient.on('connected', () => {
          setStatus('✓ Streaming live', 'success');
          qualitySpan.textContent = 'measuring...';
          startBtn.hidden = true;
          stopBtn.hidden = false;
        });

        whipClient.on('disconnected', () => {
          setStatus('Connection lost, reconnecting...', 'warning');
        });

        whipClient.on('connection_failed', () => {
          setStatus('Connection failed after multiple retries', 'error');
          setTimeout(() => stopBtn.click(), 2000);
        });

      } catch (error) {
        console.error('Error starting stream:', error);

        // Handle specific errors
        if (error.name === 'NotAllowedError') {
          setStatus(
            'Camera/microphone permission denied. Please allow access and try again.',
            'error'
          );
        } else if (error.name === 'NotFoundError') {
          setStatus(
            'No camera or microphone found. Please connect a device.',
            'error'
          );
        } else if (error.name === 'NotReadableError') {
          setStatus(
            'Camera is already in use by another application.',
            'error'
          );
        } else if (error.name === 'OverconstrainedError') {
          setStatus(
            'Selected camera does not support 720p. Try a lower resolution.',
            'error'
          );
        } else {
          setStatus(`Error: ${error.message}`, 'error');
        }
      }
    };

    // Stop streaming
    stopBtn.onclick = () => {
      webrtc.close();
      whipClient = null;
      videoElement.srcObject = null;
      qualitySpan.textContent = '-';

      startBtn.hidden = false;
      stopBtn.hidden = true;
      setStatus('Streaming stopped', 'info');
    };

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      if (webrtc) {
        webrtc.close();
      }
    });

    setStatus('Ready to stream', 'success');
  </script>
</body>
</html>
```

### Validation Steps
1. Test permission denial (deny camera access)
2. Unplug camera during streaming (see auto-switch)
3. Use invalid WHIP endpoint (see error handling)
4. Monitor quality indicator during streaming

---

## Example 4: Server-Side Stream Management {#server-side}

**What it does**: Node.js backend for creating/managing streams

**AI Prompt**:
```
"Add an endpoint to list all active streams"
```

### Server Code (Node.js + Express)

```javascript
// server.js
import express from 'express';
import { ApiKey, GcoreApi } from '@gcorevideo/rtckit-node';

const app = express();
app.use(express.json());

// Initialize Gcore API
const api = new GcoreApi(new ApiKey(process.env.GCORE_API_KEY));

// Create a new stream
app.post('/api/streams', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Stream name is required' });
    }

    const stream = await api.webrtc.createStream(name);

    res.json({
      id: stream.id,
      name: stream.name,
      whipUrl: stream.whipUrl,
      whepUrl: stream.whepUrl,
      active: stream.active,
    });
  } catch (error) {
    console.error('Error creating stream:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stream by ID
app.get('/api/streams/:id', async (req, res) => {
  try {
    const stream = await api.webrtc.getStream(parseInt(req.params.id));
    res.json(stream);
  } catch (error) {
    console.error('Error fetching stream:', error);
    res.status(404).json({ error: 'Stream not found' });
  }
});

// Delete stream
app.delete('/api/streams/:id', async (req, res) => {
  try {
    await api.webrtc.deleteStream(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting stream:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all streams
app.get('/api/streams', async (req, res) => {
  try {
    const streams = await api.webrtc.listStreams();
    res.json(streams);
  } catch (error) {
    console.error('Error listing streams:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Client Code (HTML + JavaScript)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Stream Manager</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 50px auto; padding: 0 20px; }
    video { width: 100%; max-width: 640px; background: #000; }
    button { padding: 10px 20px; margin: 5px; font-size: 14px; cursor: pointer; }
    input { padding: 8px; font-size: 14px; margin-right: 10px; }
    .section { margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; }
    #streamInfo { margin-top: 10px; padding: 10px; background: #e3f2fd; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Stream Manager</h1>

  <!-- Create Stream -->
  <div class="section">
    <h2>Create New Stream</h2>
    <input type="text" id="streamName" placeholder="Stream name" value="My Stream">
    <button id="createStream">Create Stream</button>
    <div id="streamInfo" hidden>
      <strong>Stream Created!</strong><br>
      Stream ID: <span id="streamId"></span><br>
      WHIP URL: <span id="whipUrl"></span>
    </div>
  </div>

  <!-- Start Streaming -->
  <div class="section">
    <h2>Stream Video</h2>
    <video id="preview" autoplay muted playsinline></video>
    <div>
      <button id="start">Start Streaming</button>
      <button id="stop" hidden>Stop Streaming</button>
    </div>
    <div id="status">Create a stream first</div>
  </div>

  <script type="module">
    import { WebrtcStreaming } from 'https://rtckit.gvideo.io/0.89.12/index.esm.js';

    const streamNameInput = document.getElementById('streamName');
    const createStreamBtn = document.getElementById('createStream');
    const streamInfoDiv = document.getElementById('streamInfo');
    const streamIdSpan = document.getElementById('streamId');
    const whipUrlSpan = document.getElementById('whipUrl');

    const videoElement = document.getElementById('preview');
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');
    const statusDiv = document.getElementById('status');

    let currentWhipUrl = null;
    let webrtc = null;
    let whipClient = null;

    // Create stream on server
    createStreamBtn.onclick = async () => {
      const name = streamNameInput.value.trim();
      if (!name) {
        alert('Please enter a stream name');
        return;
      }

      createStreamBtn.disabled = true;
      createStreamBtn.textContent = 'Creating...';

      try {
        const response = await fetch('/api/streams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        const stream = await response.json();

        streamIdSpan.textContent = stream.id;
        whipUrlSpan.textContent = stream.whipUrl;
        streamInfoDiv.hidden = false;

        currentWhipUrl = stream.whipUrl;
        startBtn.disabled = false;
        statusDiv.textContent = 'Ready to stream';

      } catch (error) {
        alert(`Error creating stream: ${error.message}`);
      } finally {
        createStreamBtn.disabled = false;
        createStreamBtn.textContent = 'Create Stream';
      }
    };

    // Start streaming
    startBtn.onclick = async () => {
      if (!currentWhipUrl) {
        alert('Create a stream first');
        return;
      }

      try {
        statusDiv.textContent = 'Opening camera...';

        // Initialize SDK
        webrtc = new WebrtcStreaming(currentWhipUrl, {
          videoCodecs: ['H264'],
          mediaDevicesAutoSwitch: true,
        });

        const stream = await webrtc.openSourceStream({
          audio: true,
          video: true,
          resolution: 720,
        });

        await webrtc.preview(videoElement);
        statusDiv.textContent = 'Connecting...';

        whipClient = await webrtc.run();

        whipClient.on('connected', () => {
          statusDiv.textContent = '✓ Streaming live';
          startBtn.hidden = true;
          stopBtn.hidden = false;
        });

        whipClient.on('disconnected', () => {
          statusDiv.textContent = 'Reconnecting...';
        });

        whipClient.on('connection_failed', () => {
          statusDiv.textContent = 'Connection failed';
          stopBtn.click();
        });

      } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        console.error(error);
      }
    };

    // Stop streaming
    stopBtn.onclick = () => {
      if (webrtc) {
        webrtc.close();
        webrtc = null;
      }
      whipClient = null;
      videoElement.srcObject = null;

      startBtn.hidden = false;
      stopBtn.hidden = true;
      statusDiv.textContent = 'Stopped';
    };
  </script>
</body>
</html>
```

### package.json

```json
{
  "name": "gcore-stream-manager",
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@gcorevideo/rtckit-node": "^0.14.0",
    "express": "^4.18.0"
  }
}
```

### Environment Setup

```bash
# .env
GCORE_API_KEY=your_client_id$your_secret
PORT=3000
```

### Validation Steps
1. Set `GCORE_API_KEY` in .env
2. Run `npm install && npm start`
3. Open http://localhost:3000
4. Create stream → Get WHIP URL
5. Start streaming → See live video

---

## Next Steps

**Pick an example** and ask AI:
- "Customize this for [your use case]"
- "Add [feature] to this code"
- "Simplify this by removing [feature]"

**Need more?** See [COMMON_PATTERNS.md](./COMMON_PATTERNS.md) for reusable code patterns.
