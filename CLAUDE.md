# Gcore WebRTC SDK - AI Development Guide

**For AI Assistants**: This file contains instructions for helping developers build applications using the Gcore WebRTC SDK.

## Project Overview

Gcore WebRTC SDK enables real-time video/audio streaming via WebRTC to Gcore's cloud infrastructure. This is a **monorepo** with two packages:

- **`@gcorevideo/rtckit`** - Browser client for WebRTC streaming (WHIP protocol)
- **`@gcorevideo/rtckit-node`** - Node.js server SDK for stream management

**Target Users**: External developers building streaming applications (not SDK maintainers)

---

## Quick Context

When developers ask for help, they typically want to:
1. **Start streaming** from browser to Gcore
2. **Handle media devices** (camera/mic selection, resolution)
3. **Manage errors** and reconnection
4. **Build UI controls** for streaming apps

**Key Principle**: Provide minimal, working code examples. Developers want copy-paste solutions, not theory.

---

## PROJECT CONTEXT

**AI Development Guide**: See [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md) for comprehensive AI-assisted development strategies
**Architecture**: See [DOCS.md](./DOCS.md) for technical details on demand
**Working Demo**: Reference [working Stackblitz demo](https://stackblitz.com/edit/stackblitz-starters-j2r9ar?file=index.html)
**Common Patterns**: See [examples/COMMON_PATTERNS.md](./examples/COMMON_PATTERNS.md)
**AI Usage Examples**: See [examples/AI_USAGE_EXAMPLES.md](./examples/AI_USAGE_EXAMPLES.md)

---

## CORE SDK USAGE PATTERN

### Browser Client (`@gcorevideo/rtckit`)

```javascript
import { WebrtcStreaming } from '@gcorevideo/rtckit';

// 1. Initialize with WHIP endpoint
const webrtc = new WebrtcStreaming('https://whip.gvideo.co/YOUR_STREAM_ID/whip', {
  videoCodecs: ['H264'],  // Codec preference
  mediaDevicesAutoSwitch: true,  // Auto-reconnect on device disconnect
});

// 2. Open media stream
const stream = await webrtc.openSourceStream({
  audio: 'default',  // or deviceId
  video: 'default',  // or deviceId
  resolution: 720,   // 240, 360, 480, 720, 1080
});

// 3. Preview locally
await webrtc.preview(videoElement);

// 4. Start streaming
const whipClient = await webrtc.run();

// 5. Handle events
whipClient.on('connected', () => console.log('Streaming'));
whipClient.on('disconnected', () => console.log('Reconnecting...'));

// 6. Stop
webrtc.close();
```

### Server SDK (`@gcorevideo/rtckit-node`)

```javascript
import { ApiKey, GcoreApi } from '@gcorevideo/rtckit-node';

const api = new GcoreApi(new ApiKey('YOUR_API_KEY'));

// Create stream
const stream = await api.webrtc.createStream('My Stream');
// stream.id, stream.whipUrl

// Delete stream
await api.webrtc.deleteStream(stream.id);
```

---

## HELPING DEVELOPERS

### When they ask: "How do I start streaming?"

**Provide**:
1. Full HTML template with imports
2. Initialize `WebrtcStreaming` with their WHIP endpoint
3. Device selection UI (camera/mic dropdowns)
4. Start/stop button handlers
5. Error handling for permissions

**Reference**: [AI_USAGE_EXAMPLES.md](./examples/AI_USAGE_EXAMPLES.md#basic-streaming-setup)

### When they ask: "How do I handle errors?"

**Provide**:
1. Plugin-based error handler setup
2. Event listeners for disconnection
3. Permission denied handling
4. Device unavailable handling

**Reference**: [COMMON_PATTERNS.md](./examples/COMMON_PATTERNS.md#error-handling)

### When they ask: "How do I switch cameras?"

**Provide**:
1. `mediaDevices.getCameras()` for device list
2. `openSourceStream({ video: deviceId })` to switch
3. Auto-switching with `mediaDevicesAutoSwitch` option

**Reference**: [COMMON_PATTERNS.md](./examples/COMMON_PATTERNS.md#device-management)

### When they ask: "How do I get a stream token?"

**Provide**:
1. Server-side code using `@gcorevideo/rtckit-node`
2. API key setup from [Gcore API docs](https://api.gcore.com/docs/iam#section/Authentication)
3. `createStream()` method returning WHIP URL

---

## COMMON TASKS

| Developer Wants | Key APIs | Code Pattern |
|----------------|----------|--------------|
| Basic streaming | `WebrtcStreaming`, `run()` | See [AI_USAGE_EXAMPLES.md#basic](./examples/AI_USAGE_EXAMPLES.md#basic-streaming-setup) |
| Device selection | `mediaDevices.getCameras()`, `getMicrophones()` | See [COMMON_PATTERNS.md#devices](./examples/COMMON_PATTERNS.md#device-management) |
| Error handling | `IngesterErrorHandler` plugin | See [COMMON_PATTERNS.md#errors](./examples/COMMON_PATTERNS.md#error-handling) |
| Quality monitoring | `VideoResolutionChangeDetector` plugin | See demo code |
| Reconnection | Auto with `mediaDevicesAutoSwitch: true` | Built-in |
| Stop streaming | `webrtc.close()` | Immediate |

---

## KEY CONCEPTS

### WHIP Protocol
- HTTP-based WebRTC signaling (no websockets)
- Endpoint format: `https://whip.gvideo.co/{STREAM_ID}_{TOKEN}/whip`
- Created server-side via `api.webrtc.createStream()`

### Plugins
- Extend functionality without subclassing
- Common: `IngesterErrorHandler`, `StreamMeta`, `VideoResolutionChangeDetector`
- Pass in `options.plugins` array

### Events
- **WhipClient events**: `connected`, `disconnected`, `connection_failed`
- **WebrtcStreaming events**: `mdselect`, `mdswitch`, `mdswitchoff` (media device events)

### Media Devices
- `mediaDevices` helper for enumerating devices
- `openSourceStream()` acquires media with constraints
- `preview()` shows local video before streaming

---

## BEST PRACTICES FOR AI ASSISTANTS

1. **Always provide complete, runnable code** - not pseudo-code
2. **Include CDN import** - `https://rtckit.gvideo.io/{version}/index.esm.js`
3. **Handle permissions** - show `NotAllowedError` handling
4. **Add error UI** - status messages for connection state
5. **Reference working demo** - when unsure, adapt from [Stackblitz demo](https://stackblitz.com/edit/stackblitz-starters-j2r9ar?file=index.html)

**Example Response Template**:
```
Here's a complete example:

[full HTML with script]

This code:
1. [what it does]
2. [key feature]
3. [error handling]

To customize:
- Replace `WHIP_ENDPOINT` with your stream URL
- Adjust resolution in `openSourceStream({ resolution: 720 })`
```

---

## CODEBASE NAVIGATION (for SDK development)

Only relevant if developer wants to **contribute to SDK** or **debug SDK issues**:

```
packages/rtckit/          # Browser SDK
├── src/
│   ├── WebrtcStreaming.ts      # Main streaming class
│   ├── MediaDevicesHelper.ts   # Device enumeration
│   ├── whip/WhipClient.ts      # WHIP protocol implementation
│   ├── errors.ts               # Error types
│   └── types.ts                # TypeScript types
└── docs/api/                   # Generated API docs

packages/rtckit-node/     # Node.js SDK
├── src/
│   ├── GcoreApi.ts            # Main API client
│   ├── WebrtcApi.ts           # Stream CRUD operations
│   └── auth.ts                # API key handling

```

**Build**: `npm run build` (in package directory)
**Test**: `npm test` (uses Vitest)
**Lint**: `npm run lint` (uses oxlint)

---

## DON'T OVERCOMPLICATE

Most developers need:
- Simple HTML + JS example
- Device selection
- Start/stop buttons
- Error messages

**Avoid**:
- Over-explaining WebRTC internals
- Discussing SDP/ICE unless explicitly asked
- Suggesting architectural patterns for simple demos
- Recommending frameworks unless they ask

**Focus**: Get them streaming in <5 minutes

---

## GETTING HELP

If you're unsure:
1. Check [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md) for prompting strategies and AI usage tips
2. Check [DOCS.md](./DOCS.md) for architecture details
3. Reference [working demo code](https://stackblitz.com/edit/stackblitz-starters-j2r9ar?file=index.html)
4. Adapt patterns from [COMMON_PATTERNS.md](./examples/COMMON_PATTERNS.md)

When in doubt, provide **working code** > detailed explanation.
