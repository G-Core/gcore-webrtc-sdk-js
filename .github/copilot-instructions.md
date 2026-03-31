# GitHub Copilot Instructions - Gcore WebRTC SDK

## Project Overview

This project helps developers build real-time video/audio streaming applications using Gcore's WebRTC infrastructure.

**Key Packages**:
- `@gcorevideo/rtckit` - Browser SDK for WebRTC streaming
- `@gcorevideo/rtckit-node` - Node.js SDK for stream management

**Protocol**: WHIP (WebRTC HTTP Ingestion Protocol) - HTTP-based signaling, no WebSockets

## Core SDK Pattern

The typical streaming workflow is:

```javascript
import { WebrtcStreaming } from '@gcorevideo/rtckit';

// 1. Initialize
const webrtc = new WebrtcStreaming(whipUrl, {
  videoCodecs: ['H264'],
  mediaDevicesAutoSwitch: true,
});

// 2. Get media
const stream = await webrtc.openSourceStream({
  audio: true,
  video: true,
  resolution: 720,  // 240, 360, 480, 720, 1080
});

// 3. Preview locally
await webrtc.preview(videoElement);

// 4. Start streaming
const whipClient = await webrtc.run();

// 5. Handle connection events
whipClient.on('connected', () => console.log('Live'));
whipClient.on('disconnected', () => console.log('Reconnecting...'));

// 6. Stop
webrtc.close();
```

## Common Autocomplete Contexts

### When writing device enumeration code:
```javascript
// Copilot should suggest:
const cameras = await webrtc.mediaDevices.getCameras();
const mics = await webrtc.mediaDevices.getMicrophones();
```

### When writing error handling:
```javascript
try {
  await webrtc.openSourceStream({ video: true, audio: true });
} catch (error) {
  // Copilot should suggest all getUserMedia error types:
  if (error.name === 'NotAllowedError') { }
  else if (error.name === 'NotFoundError') { }
  else if (error.name === 'NotReadableError') { }
  else if (error.name === 'OverconstrainedError') { }
}
```

### When writing plugin setup:
```javascript
import { IngesterErrorHandler, VideoResolutionChangeDetector } from '@gcorevideo/rtckit';

const webrtc = new WebrtcStreaming(whipUrl, {
  plugins: [
    new IngesterErrorHandler((reason) => {
      // Handle streaming errors
    }),
    new VideoResolutionChangeDetector(({ degraded, height }) => {
      // Monitor quality
    }),
  ],
});
```

### When writing event handlers:
```javascript
// For WhipClient:
whipClient.on('connected', () => {});
whipClient.on('disconnected', () => {});
whipClient.on('connection_failed', () => {});

// For WebrtcStreaming:
webrtc.on('mdselect', (event) => {});
webrtc.on('mdswitch', (event) => {});
webrtc.on('mdswitchoff', (event) => {});
```

## Server-Side Patterns

### When writing Node.js API code:
```javascript
import { ApiKey, GcoreApi } from '@gcorevideo/rtckit-node';

const api = new GcoreApi(new ApiKey(process.env.GCORE_API_KEY));

// Create stream
const stream = await api.webrtc.createStream('Stream Name');
// → Returns: { id, name, whipUrl, whepUrl, active }

// List streams
const streams = await api.webrtc.listStreams();

// Delete stream
await api.webrtc.deleteStream(streamId);
```

## Key APIs Reference

### WebrtcStreaming Methods
- `openSourceStream(params)` - Acquire media with constraints
- `preview(videoElement)` - Show local preview
- `run()` - Start streaming (returns WhipClient)
- `close()` - Stop streaming and cleanup
- `toggleVideo(enabled)` - Enable/disable video track
- `toggleAudio(enabled)` - Enable/disable audio track
- `mediaDevices` - Device enumeration helper

### WebrtcStreamParams Interface
```typescript
{
  audio: string | boolean;  // deviceId, true, or false
  video: string | boolean;  // deviceId, true, or false
  resolution?: number;      // Height in pixels
}
```

### WhipClient Events
- `'connected'` - Streaming established
- `'disconnected'` - Connection lost, reconnecting
- `'connection_failed'` - Reconnection failed

### MediaDevicesHelper Methods
- `getCameras()` - List video input devices
- `getMicrophones()` - List audio input devices
- `getAvailableVideoResolutions(deviceId)` - Probe supported resolutions
- `reset()` - Clear device cache

## Common Imports

Suggest these based on context:

```javascript
// Browser SDK - main
import { WebrtcStreaming } from '@gcorevideo/rtckit';

// Browser SDK - plugins
import {
  IngesterErrorHandler,
  IngesterErrorReason,
  VideoResolutionChangeDetector,
  StreamMeta,
} from '@gcorevideo/rtckit';

// Browser SDK - logging
import { Logger, LogTracer, setTracer } from '@gcorevideo/rtckit';

// Node.js SDK
import { ApiKey, GcoreApi } from '@gcorevideo/rtckit-node';
```

## CDN Import Pattern

For vanilla JS/HTML:
```javascript
import { WebrtcStreaming } from 'https://rtckit.gvideo.io/0.89.12/index.esm.js';
```

## Common UI Patterns

### Device dropdown population:
```javascript
async function populateDropdown(selectElement, devices) {
  selectElement.innerHTML = '';
  devices.forEach(device => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || 'Unknown Device';
    selectElement.appendChild(option);
  });
}
```

### Status indicator:
```javascript
function setStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;  // info, success, error, warning
}
```

### Streaming timer:
```javascript
let streamStartTime = Date.now();
const timer = setInterval(() => {
  const elapsed = Date.now() - streamStartTime;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const display = `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  document.getElementById('timer').textContent = display;
}, 1000);
```

## Standard Options

Default configuration options to suggest:

```javascript
const webrtc = new WebrtcStreaming(whipUrl, {
  videoCodecs: ['H264'],           // Preferred codec order
  audioCodecs: ['opus'],           // Audio codec preference
  iceTransportPolicy: 'relay',     // Or 'all' for direct connections
  icePreferTcp: true,              // Prefer TCP over UDP
  mediaDevicesAutoSwitch: true,    // Auto-reconnect on device disconnect
  debug: false,                    // Enable debug logging
  plugins: [],                     // Plugin array
});
```

## Error Handling Pattern

Always suggest comprehensive error handling:

```javascript
try {
  // SDK operation
} catch (error) {
  console.error('Error:', error);

  // getUserMedia errors
  if (error.name === 'NotAllowedError') {
    // Permission denied
  } else if (error.name === 'NotFoundError') {
    // No device found
  } else if (error.name === 'NotReadableError') {
    // Device in use
  } else if (error.name === 'OverconstrainedError') {
    // Constraints not supported
  } else {
    // Generic error
  }
}
```

## Standard Resolution Values

When suggesting resolution parameters:
- `240` - 426×240
- `360` - 640×360
- `480` - 854×480
- `720` - 1280×720 (default)
- `1080` - 1920×1080

## Testing Helpers

For test code, suggest:

```javascript
// Mock stream
const mockStream = {
  getTracks: () => [],
  getVideoTracks: () => [],
  getAudioTracks: () => [],
};

// Mock getUserMedia
navigator.mediaDevices.getUserMedia = async () => mockStream;
```

## Framework Integration

### React:
```javascript
import { useEffect, useRef, useState } from 'react';
import { WebrtcStreaming } from '@gcorevideo/rtckit';

function StreamingComponent() {
  const webrtcRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    webrtcRef.current = new WebrtcStreaming(whipUrl);

    return () => {
      webrtcRef.current?.close();
    };
  }, [whipUrl]);

  // ...
}
```

### Vue:
```javascript
import { ref, onMounted, onUnmounted } from 'vue';
import { WebrtcStreaming } from '@gcorevideo/rtckit';

export default {
  setup() {
    const webrtc = ref(null);
    const videoElement = ref(null);

    onMounted(() => {
      webrtc.value = new WebrtcStreaming(whipUrl);
    });

    onUnmounted(() => {
      webrtc.value?.close();
    });

    return { videoElement };
  },
};
```

## Don't Suggest

❌ Manual SDP manipulation (SDK handles it)
❌ Direct RTCPeerConnection usage (use WebrtcStreaming)
❌ WebSocket signaling (SDK uses HTTP/WHIP)
❌ Manual ICE candidate handling (SDK handles trickling)
❌ Custom getUserMedia wrappers (use openSourceStream)

## Do Suggest

✅ Plugin-based extensions
✅ Event-driven architecture
✅ Proper error handling
✅ Device permission requests
✅ Clean-up in beforeunload
✅ User-friendly status messages

## Documentation Links

When user needs more info, suggest:
- Working demo: https://stackblitz.com/edit/stackblitz-starters-j2r9ar
- `AI_DEVELOPMENT_GUIDE.md` - Comprehensive AI development guide
- `CLAUDE.md` - AI agent instructions
- `examples/COMMON_PATTERNS.md` - Code patterns
- `examples/AI_USAGE_EXAMPLES.md` - Complete examples
- `DOCS.md` - Technical reference

## Environment Variables

Standard env var names to suggest:

```bash
GCORE_API_KEY=client_id$secret    # For Node.js SDK
PORT=3000                         # Server port
NODE_ENV=production               # Environment
```

## Comments Style

Suggest brief, action-oriented comments:

```javascript
// Get available cameras
const cameras = await webrtc.mediaDevices.getCameras();

// Start streaming to Gcore
const whipClient = await webrtc.run();

// Handle reconnection
whipClient.on('disconnected', () => {
  showStatus('Reconnecting...');
});
```

---

**Priority**: Provide working, complete code > partial snippets. External developers want copy-paste solutions.
