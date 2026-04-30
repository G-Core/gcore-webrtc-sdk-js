# TECHNICAL DOCUMENTATION
## Gcore WebRTC SDK

**Purpose**: Browser and Node.js SDKs for real-time video/audio streaming via Gcore's cloud SFU infrastructure.

**Target Audience**: External developers building streaming applications

**This file**: Loaded on-demand by AI agents. Contains architecture, API surface, non-obvious conventions.

---

## PROJECT STRUCTURE

### Monorepo Layout

```
gcore-webrtc-sdk-js/
├── packages/
│   ├── rtckit/              # Browser SDK (@gcorevideo/rtckit)
│   └── rtckit-node/         # Node.js SDK (@gcorevideo/rtckit-node)
├── CLAUDE.md               # AI agent instructions (start here)
├── DOCS.md                 # This file - technical reference
└── examples/               # AI-friendly code patterns
```

**Tech Stack**:
- TypeScript
- Rollup (bundling)
- Vitest (testing)
- NPM workspaces (monorepo)

---

## PACKAGE: @gcorevideo/rtckit (Browser)

**Purpose**: WebRTC streaming from browser to Gcore cloud

**Version**: 0.89.x (see package.json)

**Entry Point**: `packages/rtckit/src/index.ts`

**Distribution**:
- NPM: `npm install @gcorevideo/rtckit`
- CDN: `https://rtckit.gvideo.io/{version}/index.esm.js`

### Key Classes

#### WebrtcStreaming
**File**: `src/WebrtcStreaming.ts`

Main class for browser-side streaming. Manages:
- Media device access
- Local preview
- WHIP client lifecycle
- Automatic reconnection

**API**:
```typescript
class WebrtcStreaming {
  constructor(whipUrl: string, options?: WebrtcStreamingOptions)

  // Media acquisition
  openSourceStream(params: WebrtcStreamParams): Promise<MediaStream>
  preview(videoElement: HTMLVideoElement): Promise<void>

  // Streaming lifecycle
  run(): Promise<WhipClient>
  close(): void

  // Device controls
  toggleVideo(enable: boolean): void
  toggleAudio(enable: boolean): void

  // Device management
  mediaDevices: MediaDevicesHelper

  // Events
  on(event: WebrtcStreamingEvents, handler: Function): void
  off(event: WebrtcStreamingEvents, handler: Function): void
}
```

**Options** (`WebrtcStreamingOptions`):
- `videoCodecs?: string[]` - Codec preference (e.g., `['H264', 'VP8']`)
- `audioCodecs?: string[]` - Audio codec preference
- `iceTransportPolicy?: RTCIceTransportPolicy` - 'all' | 'relay'
- `icePreferTcp?: boolean` - Prefer TCP for ICE candidates
- `mediaDevicesAutoSwitch?: boolean` - Auto-reconnect on device disconnect
- `plugins?: WhipClientPlugin[]` - Extend functionality
- `debug?: boolean` - Enable debug logging

**Stream Parameters** (`WebrtcStreamParams`):
- `audio: string | boolean` - Device ID, 'default', or false
- `video: string | boolean` - Device ID, 'default', or false
- `resolution?: number` - Height in pixels (240, 360, 480, 720, 1080)

**Events**:
- `mdselect` - Device selected: `{ kind: 'audio'|'video', device: MediaInputDeviceInfo }`
- `mdswitch` - Device auto-switched: `{ kind, prev, device }`
- `mdswitchoff` - Device disconnected: `{ kind, device }`

---

#### WhipClient
**File**: `src/whip/WhipClient.ts`

Low-level WHIP (WebRTC HTTP Ingestion Protocol) implementation.

**Note**: Usually not used directly - `WebrtcStreaming.run()` creates it.

**API**:
```typescript
class WhipClient {
  constructor(endpoint: string, options?: WhipClientOptions)

  publish(stream: MediaStream): Promise<void>
  stop(): Promise<void>
  restart(): Promise<void>  // ICE restart

  on(event: WhipClientEvents, handler: Function): void
}
```

**Events**:
- `connected` - Streaming established
- `disconnected` - Connection lost, reconnecting
- `connection_failed` - Reconnection attempts exhausted

**Under the hood**:
- Creates `RTCPeerConnection`
- Sends SDP offer via HTTP POST to WHIP endpoint
- Receives SDP answer
- Handles ICE candidate trickling (PATCH requests)
- Auto-reconnects with exponential backoff

---

#### MediaDevicesHelper
**File**: `src/MediaDevicesHelper.ts`

Wrapper around `navigator.mediaDevices` with device enumeration and caching.

**API**:
```typescript
class MediaDevicesHelper {
  // Enumerate devices
  getCameras(): Promise<MediaInputDeviceInfo[]>
  getMicrophones(): Promise<MediaInputDeviceInfo[]>

  // Probe supported resolutions
  getAvailableVideoResolutions(deviceId: string): Promise<VideoResolution[]>

  // Clear cache (call after device list changes)
  reset(): void
}
```

**VideoResolution**:
```typescript
type VideoResolution = { width: number; height: number; }

// Standard resolutions available as STD_VIDEORES
const STD_VIDEORES = {
  "1080": { width: 1920, height: 1080 },
  "720": { width: 1280, height: 720 },
  "480": { width: 854, height: 480 },
  "360": { width: 640, height: 360 },
  "240": { width: 426, height: 240 },
}
```

**Device Probing**: `getAvailableVideoResolutions()` tests each standard resolution with getUserMedia to determine support.

---

### Plugins

**Pattern**: Extend `WhipClient` behavior without subclassing

**Interface**:
```typescript
interface WhipClientPlugin {
  install(client: WhipClient): void;
}
```

**Built-in Plugins**:

#### IngesterErrorHandler
**File**: `src/aux/IngesterErrorHandler.ts`

Parses HTTP error responses from Gcore ingester.

```typescript
new IngesterErrorHandler((reason: IngesterErrorReason) => {
  // reason: StreamNotExists, StreamTokenInvalid, DuplicateStream
})
```

#### StreamMeta
**File**: `src/aux/StreamMeta.ts`

Sends metadata with SDP (custom headers).

```typescript
const meta = new StreamMeta();
meta.init({ customData: 'value' });
// Or use meta.request() to set per-request metadata
```

#### VideoResolutionChangeDetector
**File**: `src/aux/VideoResolutionChangeDetector.ts`

Detects when video resolution drops (e.g., due to bandwidth).

```typescript
new VideoResolutionChangeDetector(({ degraded, height, srcHeight }) => {
  if (degraded) {
    console.log(`Quality dropped to ${height}p from ${srcHeight}p`);
  }
})
```

---

### Error Handling

**Error Types** (`src/errors.ts`):

```typescript
class NetworkError extends Error           // Network failure
class TimeoutError extends Error           // Request timeout
class ServerRequestError extends Error     // HTTP 4xx/5xx
  status: number                          // HTTP status code
  detail?: any                            // Response body
class ConflictError extends ServerRequestError  // HTTP 409
class MalformedResponseError extends Error // Invalid response format
class SessionClosedError extends Error     // Session closed by server
class ReconnectAttemptsExceededError extends Error  // Reconnect failed
```

**Strategy**:
- Network/timeout errors → auto-retry with exponential backoff
- `409 Conflict` → duplicate stream (show user error)
- `SessionClosedError` → server closed session (terminal)
- `ReconnectAttemptsExceededError` → emit `connection_failed` event

**Retry Logic**: `src/helpers/fetch.ts` - `withRetries()` function

---

### Data Flow

**Streaming Lifecycle**:

```
1. Create WebrtcStreaming
   ↓
2. openSourceStream() → getUserMedia → MediaStream
   ↓
3. preview() → attach to <video> element
   ↓
4. run() → create WhipClient → publish()
   ↓ (WHIP protocol)
5. POST SDP offer → server responds with SDP answer
   ↓
6. PATCH ICE candidates → trickle ICE
   ↓
7. RTCPeerConnection established
   ↓
8. Streaming active (connected event)
   ↓
9. Monitor connection (ICE state)
   ↓
10. On disconnect → auto-restart (ICE restart or full restart)
    ↓
11. close() → DELETE session → cleanup
```

**Device Auto-Switch** (if `mediaDevicesAutoSwitch: true`):
```
Device disconnect detected (track.onended)
   ↓
getUserMedia with updated constraints
   ↓
replaceTrack() on RTCRtpSender
   ↓
Emit 'mdswitch' event
```

---

## PACKAGE: @gcorevideo/rtckit-node (Node.js)

**Purpose**: Server-side stream management API

**Entry Point**: `packages/rtckit-node/src/index.ts`

**Installation**: `npm install @gcorevideo/rtckit-node`

### Key Classes

#### GcoreApi
**File**: `src/GcoreApi.ts`

Main API client.

```typescript
class GcoreApi {
  constructor(auth: AuthKey, host?: string)

  webrtc: WebrtcApi  // Stream management
}
```

#### WebrtcApi
**File**: `src/WebrtcApi.ts`

WebRTC stream CRUD operations.

```typescript
class WebrtcApi {
  // Create stream
  createStream(name: string, options?: CreateStreamOptions): Promise<Stream>

  // List streams
  listStreams(): Promise<Stream[]>

  // Get stream by ID
  getStream(id: number): Promise<Stream>

  // Delete stream
  deleteStream(id: number): Promise<void>

  // Update stream
  updateStream(id: number, data: UpdateStreamData): Promise<Stream>
}
```

**Stream Object**:
```typescript
type Stream = {
  id: number;
  name: string;
  whipUrl: string;     // Use in browser: new WebrtcStreaming(whipUrl)
  whepUrl: string;     // For playback
  active: boolean;
  created_at: string;
}
```

#### Authentication
**File**: `src/auth.ts`

```typescript
class ApiKey implements AuthKey {
  constructor(key: string)  // Format: "client_id$secret"
}
```

**Getting API Key**: https://api.gcore.com/docs/iam#section/Authentication

---

### API Integration Pattern

**Server** (Node.js):
```javascript
import { ApiKey, GcoreApi } from '@gcorevideo/rtckit-node';

const api = new GcoreApi(new ApiKey(process.env.GCORE_API_KEY));
const stream = await api.webrtc.createStream('User Stream');

// Send stream.whipUrl to client
res.json({ whipUrl: stream.whipUrl });
```

**Client** (Browser):
```javascript
import { WebrtcStreaming } from '@gcorevideo/rtckit';

// Get whipUrl from server
const response = await fetch('/api/create-stream');
const { whipUrl } = await response.json();

// Start streaming
const webrtc = new WebrtcStreaming(whipUrl);
await webrtc.openSourceStream({ audio: true, video: true });
await webrtc.run();
```

---

## WHIP PROTOCOL DETAILS

**WHIP**: WebRTC HTTP Ingestion Protocol (IETF draft)

**Why WHIP?** Simple HTTP-based signaling instead of WebSocket complexity.

### Protocol Flow

1. **POST /whip** - Send SDP offer
   - Request body: SDP offer (text/plain)
   - Response: SDP answer + `Location` header (session URL)

2. **PATCH {session-url}** - Trickle ICE candidates
   - Request body: ICE candidate fragment (application/trickle-ice-sdpfrag)

3. **DELETE {session-url}** - Close session

**Endpoint Format**: `https://whip.gvideo.co/{STREAM_ID}_{TOKEN}/whip`

**Authentication**: Embedded in URL (token), no separate auth headers

**ICE Trickling**: Candidates sent immediately as they're gathered

---

## NON-OBVIOUS CONVENTIONS

### Device IDs
- `'default'` - Browser's default device
- Empty string or `false` - Disable that media kind
- Actual deviceId string - Specific device

### Resolution Handling
- Specified as height (e.g., `720`)
- SDK uses standard aspect ratios (16:9 for 1080/720/360, 4:3 for 480/240)
- `getAvailableVideoResolutions()` probes actual device support

### Event Emitter
- Uses `event-lite` library (minimal EventEmitter)
- Pattern: `on(event, handler)`, `off(event, handler)`, `emit(event, ...args)`

### Media Stream Lifecycle
- `openSourceStream()` creates **new** MediaStream each call
- Previous streams NOT automatically closed (call `closeMediaStream()` if needed)
- `preview()` attaches stream to video element (`srcObject`)

### Auto-Reconnection
- **ICE restart** tried first (faster, maintains session)
- **Full restart** if ICE restart fails (new SDP offer/answer)
- Max retries configurable via `options.maxReconnectAttempts` (default: 5)
- Backoff: 1s, 2s, 4s, 8s, 16s (exponential)

---

## TESTING STRATEGY

**Framework**: Vitest with jsdom

**Location**: `packages/rtckit/src/__tests__/`

**Mocking**: WebRTC APIs mocked via jsdom polyfills
- `RTCPeerConnection` - Mock implementation
- `getUserMedia` - Returns fake MediaStream
- Timers - `@sinonjs/fake-timers` for time-dependent tests

**Pattern**:
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('WebrtcStreaming', () => {
  it('opens source stream', async () => {
    const webrtc = new WebrtcStreaming('https://example.com/whip');
    const stream = await webrtc.openSourceStream({ video: true });
    expect(stream.getVideoTracks()).toHaveLength(1);
  });
});
```

**Run**: `npm test` (in packages/rtckit/)

---

## DEPENDENCIES

**Critical Libraries**:

| Library | Purpose | Notes |
|---------|---------|-------|
| `event-lite` | Event emitter | Minimal, no dependencies |
| `sdp-transform` | SDP parsing | Modify SDP for codec filtering |
| `@gcorevideo/utils` | Shared utilities | Logging, error reporting |
| `axios` (node) | HTTP client | Server-side API calls |

**Dev Dependencies**:
- `typescript` - Type checking and compilation
- `vitest` - Testing framework
- `rollup` - Bundling (browser SDK)
- `oxlint` - Fast linting
- `prettier` - Code formatting

---

## BUILD & DEVELOPMENT

### Browser SDK Build

```bash
cd packages/rtckit
npm run build        # Compile TS → lib/
npm run build:bundle # Rollup → lib/bundle.js
npm run build:all    # Both
```

**Outputs**:
- `lib/index.esm.js` - ES module (tree-shakeable)
- `lib/index.d.ts` - TypeScript definitions
- `lib/bundle.js` - UMD bundle (standalone)

### Node SDK Build

```bash
cd packages/rtckit-node
npm run build       # Compile TS → dist/
```

### API Documentation

```bash
cd packages/rtckit
npm run docs        # Generate docs/api/ markdown
```

Uses Microsoft API Extractor + API Documenter.

### Linting & Formatting

```bash
npm run lint        # oxlint (fast)
npm run format      # prettier
```

**Pre-commit**: Husky hook runs lint + format

---

## COMMON PITFALLS

### 1. Permissions
Always handle `NotAllowedError` from `getUserMedia`:
```javascript
try {
  await webrtc.openSourceStream({ video: true });
} catch (e) {
  if (e.name === 'NotAllowedError') {
    alert('Camera permission denied');
  }
}
```

### 2. Device Enumeration
Labels only available after permission granted:
```javascript
// First getUserMedia (any device)
await navigator.mediaDevices.getUserMedia({ video: true });
// Now enumerateDevices() has labels
const cameras = await webrtc.mediaDevices.getCameras();
```

### 3. WHIP Endpoint Format
Must include token: `{base}/STREAMID_TOKEN/whip`
- Wrong: `https://whip.gvideo.co/12345/whip`
- Right: `https://whip.gvideo.co/12345_abc123.../whip`

### 4. Resolution Constraints
Some devices don't support exact resolutions. Use `getAvailableVideoResolutions()` to check:
```javascript
const supported = await webrtc.mediaDevices.getAvailableVideoResolutions(deviceId);
// Use supported[0].height as resolution
```

### 5. Clean Shutdown
Always call `close()` before page unload:
```javascript
window.addEventListener('beforeunload', () => {
  webrtc.close();
});
```

---

## ARCHITECTURE DECISIONS

### Why WHIP over WebSocket?
- **Simpler** - HTTP is universally supported
- **Scalable** - Stateless signaling
- **Proxy-friendly** - Works through HTTP proxies
- **Standard** - IETF draft (emerging standard)

### Why Plugins?
- **Extensibility** without SDK changes
- **Opt-in** functionality (tree-shaking)
- **Testability** (mock plugins)

### Why Monorepo?
- **Shared utilities** (`@gcorevideo/utils`)
- **Version sync** between client/server
- **Unified development** workflow

### Why TypeScript?
- **Type safety** for WebRTC APIs
- **Better DX** with autocomplete
- **Documentation** via JSDoc + types

---

## FURTHER READING

**External Resources**:
- [Gcore WebRTC API Docs](https://gcore.com/docs/streaming-platform/api/real-time-video-api-tutorial)
- [WHIP Spec (IETF Draft)](https://datatracker.ietf.org/doc/draft-ietf-wish-whip/)
- [MDN: WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

**Internal Links**:
- [packages/rtckit/README.md](./packages/rtckit/README.md) - Browser SDK readme
- [packages/rtckit-node/README.md](./packages/rtckit-node/README.md) - Node SDK readme
- [packages/rtckit/docs/api/](./packages/rtckit/docs/api/) - Generated API docs

---

**Last Updated**: 2026-03-26 (auto-update on major changes)
