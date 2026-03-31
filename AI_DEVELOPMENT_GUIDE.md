# AI-Assisted Development with Gcore WebRTC SDK

**For Developers**: This guide shows how to use AI assistants (Claude, Copilot, ChatGPT, Cursor) to build streaming applications with Gcore WebRTC SDK.

**Philosophy**: AI is your pair programmer. You describe **what** you want, AI provides **how** to code it.

---

## Quick Start with AI

### 1. Basic Streaming App (5 minutes)

**What to ask your AI**:

> "Create a complete HTML page using Gcore WebRTC SDK that:
> - Shows a video preview of my camera
> - Has a Start Streaming button
> - Uses this WHIP endpoint: https://whip.gvideo.co/MY_STREAM_ID/whip
> - Displays connection status
>
> Use the CDN import: https://rtckit.gvideo.io/0.89.12/index.esm.js"

**Expected result**: Runnable HTML file with:
- SDK import
- Video element
- Button to start/stop
- Status messages
- Error handling

**Validation**: Open in browser → Allow camera → Click Start → See preview streaming

---

### 2. Add Device Selection

**What to ask**:

> "Add camera and microphone dropdowns to my streaming app. When I change the device, it should reconnect automatically."

**Expected result**:
- `<select>` elements populated with device names
- `onChange` handlers that call `openSourceStream()`
- Device list updates on page load

**Validation**: Change camera → Preview switches → Streaming continues

---

### 3. Add Quality Control

**What to ask**:

> "Add a resolution selector (240p, 360p, 480p, 720p, 1080p) that lets me control video quality."

**Expected result**:
- Resolution dropdown
- Passes `resolution` parameter to `openSourceStream()`
- Shows current resolution in UI

**Validation**: Change resolution → Video restarts with new quality

---

### 4. Add Error Handling

**What to ask**:

> "Handle these errors:
> - Permission denied → Show friendly message
> - Device not available → Fallback to another camera
> - Connection failed → Show reconnecting status
>
> Use the IngesterErrorHandler plugin to catch stream errors."

**Expected result**:
- try/catch blocks for `openSourceStream()`
- Event listeners for connection events
- User-friendly error messages

---

## Prompting Strategies

### ✅ Good Prompts

**Specific + Context**:
```
"I'm building a video streaming page. Add a feature that:
- Automatically mutes the preview video (no echo)
- Shows the current video resolution above the preview
- Displays bitrate stats every 5 seconds

I'm using Gcore WebRTC SDK with this code: [paste existing code]"
```

**Result-oriented**:
```
"When the user disconnects their camera during streaming,
I want to automatically switch to another available camera.
Show a notification when this happens."
```

**With examples**:
```
"Like the Stackblitz demo (https://stackblitz.com/edit/stackblitz-starters-j2r9ar),
but simplified for just start/stop streaming without device selection."
```

### ❌ Weak Prompts

**Too vague**:
```
"Help me with WebRTC"
```
→ AI doesn't know what you need

**No context**:
```
"Why doesn't my video work?"
```
→ AI can't debug without seeing code

**Theory questions**:
```
"Explain how WHIP protocol works"
```
→ You want code, not lectures

### 💡 Prompt Templates

#### Building a Feature
```
"Add [FEATURE] to my Gcore WebRTC streaming app:
- [REQUIREMENT 1]
- [REQUIREMENT 2]
- [UI BEHAVIOR]

Current code: [paste code]"
```

#### Fixing an Issue
```
"I'm getting [ERROR MESSAGE] when [ACTION].
Here's my code: [paste]
What's wrong and how to fix it?"
```

#### Improving Code
```
"My streaming app works but [PROBLEM].
How can I improve it?

Code: [paste]"
```

---

## AI-Friendly Code Patterns

### Pattern 1: Modular Setup

```javascript
// AI can easily modify independent functions
async function setupDevices() {
  const cameras = await webrtc.mediaDevices.getCameras();
  populateCameraDropdown(cameras);
}

async function startStreaming() {
  const stream = await webrtc.openSourceStream({ video: true, audio: true });
  await webrtc.preview(videoElement);
  const client = await webrtc.run();
  setupEventHandlers(client);
}

function setupEventHandlers(client) {
  client.on('connected', () => updateStatus('Streaming'));
  client.on('disconnected', () => updateStatus('Reconnecting...'));
}
```

**Why good**: Clear function names, single responsibility, easy to extend

### Pattern 2: Configuration Object

```javascript
const CONFIG = {
  whipEndpoint: 'https://whip.gvideo.co/STREAM_ID/whip',
  defaultResolution: 720,
  videoCodecs: ['H264'],
  autoReconnect: true,
};

const webrtc = new WebrtcStreaming(CONFIG.whipEndpoint, {
  videoCodecs: CONFIG.videoCodecs,
  mediaDevicesAutoSwitch: CONFIG.autoReconnect,
});
```

**Why good**: AI can suggest config changes without touching logic

### Pattern 3: UI State Management

```javascript
const UI = {
  status: document.getElementById('status'),
  startBtn: document.getElementById('start'),
  stopBtn: document.getElementById('stop'),

  setStreaming() {
    this.status.textContent = 'Streaming';
    this.startBtn.hidden = true;
    this.stopBtn.hidden = false;
  },

  setReady() {
    this.status.textContent = 'Ready';
    this.startBtn.hidden = false;
    this.stopBtn.hidden = true;
  },
};
```

**Why good**: UI updates centralized, easy for AI to add new states

---

## Common Use Cases

### Use Case 1: Basic Webcam Broadcast

**Ask AI**: "Create a minimal streaming page with just start/stop"

**You'll get**:
- HTML with video element + 2 buttons
- WebrtcStreaming initialization
- openSourceStream() → run()
- close() on stop

**Customize by asking**: "Add a timer showing streaming duration"

---

### Use Case 2: Multi-Camera Setup

**Ask AI**: "Support multiple cameras, let user switch during streaming"

**You'll get**:
- Device enumeration with getCameras()
- Dropdown with onChange handler
- openSourceStream({ video: newDeviceId })

**Customize**: "Also show available resolutions for each camera"

---

### Use Case 3: Stream Manager Dashboard

**Ask AI**: "Create a dashboard to manage multiple streams using the Node.js SDK"

**You'll get**:
- Server code with GcoreApi
- List streams endpoint
- Create/delete stream UI
- Table showing active streams

**Customize**: "Add ability to rename streams"

---

### Use Case 4: Quality Adaptation

**Ask AI**: "Monitor video quality and show alerts when it degrades"

**You'll get**:
- VideoResolutionChangeDetector plugin
- Quality indicator in UI
- Color-coded status (red = degraded, green = good)

**Customize**: "Suggest lowering resolution when quality drops"

---

## Debugging with AI

### Scenario 1: Camera Not Working

**You**: "Camera preview shows black screen"

**AI asks for**:
- Browser console errors
- Your code
- Device permissions granted?

**AI suggests**:
1. Check console for `getUserMedia` errors
2. Verify device permissions
3. Try different camera with `getCameras()`
4. Test in different browser

**Follow-up**: "Add debugging logs before openSourceStream()"

---

### Scenario 2: Stream Disconnects

**You**: "Stream works for 30 seconds then disconnects"

**AI asks**:
- Console errors?
- Network stable?
- Event listener for 'disconnected'?

**AI suggests**:
1. Check WHIP endpoint validity
2. Add connection event logging
3. Verify firewall/proxy allows WebRTC
4. Check token expiration

---

### Scenario 3: Poor Video Quality

**You**: "Video is pixelated/blurry"

**AI suggests**:
1. Check selected resolution in `openSourceStream()`
2. Verify camera supports that resolution
3. Use `getAvailableVideoResolutions()` to check
4. Add VideoResolutionChangeDetector to monitor

---

## AI Tools Comparison

### Claude (via Claude Code CLI)

**Best for**: Full-stack development, reading docs, complex refactoring

**Strengths**:
- Understands context from multiple files
- Can reference CLAUDE.md and DOCS.md
- Suggests architectural improvements

**Example prompt**:
```
"Read my existing streaming app at src/stream.js and add
server-side stream creation using the Node SDK.
Create an API endpoint that generates WHIP URLs."
```

---

### GitHub Copilot

**Best for**: Inline code completion, boilerplate generation

**Strengths**:
- Fast autocomplete as you type
- Learns from your existing code patterns
- Good for repetitive code (event handlers, UI updates)

**Example usage**:
```javascript
// Type this comment:
// Function to populate camera dropdown with device list

// Copilot suggests:
function populateCameraDropdown(cameras) {
  const select = document.getElementById('camera');
  select.innerHTML = '';
  cameras.forEach(camera => {
    const option = document.createElement('option');
    option.value = camera.deviceId;
    option.textContent = camera.label;
    select.appendChild(option);
  });
}
```

---

### Cursor AI

**Best for**: Multi-file edits, refactoring, adding features

**Strengths**:
- Chat + inline edits simultaneously
- Can edit multiple files in one go
- Understands project structure

**Example command**:
```
⌘K: "Extract all UI logic into a separate ui-manager.js file
and import it in main.js"
```

---

### ChatGPT / Claude (Chat)

**Best for**: Learning, debugging, explaining concepts

**Strengths**:
- Conversational debugging
- Explains error messages
- Suggests alternatives

**Example conversation**:
```
You: "What does 'NotReadableError' mean in getUserMedia?"
AI: "It means the camera is already in use by another app..."
You: "How do I detect this before calling getUserMedia?"
AI: "You can't detect it in advance, but you can handle it..."
```

---

## Best Practices for AI-Assisted Dev

### 1. Start with Working Code
- Use the [Stackblitz demo](https://stackblitz.com/edit/stackblitz-starters-j2r9ar) as a base
- Ask AI to modify it, not create from scratch
- "Take this demo and simplify it to just start/stop"

### 2. Iterate Incrementally
- Don't ask for everything at once
- Build feature by feature
- Test each change before asking for the next

**Bad**: "Build a complete streaming platform with user auth, storage, and analytics"
**Good**: "Add user login to my existing streaming page"

### 3. Provide Context
- Paste your current code
- Mention which SDK version you're using
- Describe what works and what doesn't

**Template**:
```
"I'm using Gcore WebRTC SDK v0.89.x.
Current code: [paste]
Working: Camera preview, start streaming
Not working: Stop button doesn't actually stop the stream
How to fix?"
```

### 4. Ask for Explanations
- Don't just copy/paste code
- Ask "Why does this work?"
- Learn the pattern for future changes

**Example**:
```
"Explain why you used whipClient.on('connected') instead of
checking some connection state variable"
```

### 5. Validate Immediately
- Test AI-generated code right away
- Report errors back to AI if it doesn't work
- AI will fix and improve its suggestion

---

## Quick Reference: What to Ask

| You Want | Ask AI |
|----------|--------|
| Start from scratch | "Create a minimal streaming page with Gcore WebRTC SDK using CDN" |
| Add feature | "Add [feature] to my code: [paste code]" |
| Fix error | "Getting [error] when [action], here's my code: [paste]" |
| Improve code | "My code works but [issue], how to improve? [paste]" |
| Understand concept | "Explain how [concept] works in Gcore WebRTC SDK" |
| Choose approach | "Should I use [option A] or [option B] for [use case]?" |
| Optimize performance | "My stream is laggy, what can I optimize? [paste code]" |
| Handle edge case | "What happens if [scenario]? How to handle it?" |

---

## Sample AI Session

**Real example of building a feature with AI:**

**You**:
```
Create a streaming page with camera preview and start/stop buttons
using Gcore WebRTC SDK from CDN.
```

**AI**: [Provides complete HTML with basic streaming]

**You**: "Test it... works! Now add:"
```
- Camera selection dropdown
- Show current resolution
- Display "Streaming" status in green when active
```

**AI**: [Updates code with device selection and status]

**You**: "Test it... camera dropdown empty! Fix:"

**AI**:
```
Need to call getCameras() after getting initial permission.
Here's the fix: [shows corrected code]
```

**You**: "Works! Last thing:"
```
When connection fails, show retry count and a manual retry button
```

**AI**: [Adds connection_failed handler with retry UI]

**Result**: Feature-complete streaming app in ~15 minutes

---

## Troubleshooting AI Responses

### Problem: AI gives outdated syntax

**Solution**: Specify SDK version
```
"Using @gcorevideo/rtckit v0.89.x, show me the current API for..."
```

### Problem: AI suggests complex patterns

**Solution**: Ask for simpler version
```
"That works but it's too complex. Give me a simpler version
for a basic use case."
```

### Problem: Code doesn't work

**Solution**: Provide error details
```
"That code gives this error: [paste error]
Here's the full console output: [paste]
What's wrong?"
```

### Problem: AI doesn't understand context

**Solution**: Reference docs explicitly
```
"According to DOCS.md in this repo, the correct way is [approach].
Update your suggestion to match."
```

---

## Advanced: Custom Prompts

### Creating Reusable Prompts

Save these in a file for consistent results:

**Prompt: Add Feature Template**
```
Add [FEATURE NAME] to my Gcore WebRTC streaming application.

Requirements:
- [REQUIREMENT 1]
- [REQUIREMENT 2]
- [REQUIREMENT 3]

Current code:
[PASTE CODE]

Expected behavior:
[DESCRIBE USER INTERACTION]

Please:
1. Show the modified code
2. Explain what changed
3. List any edge cases I should test
```

**Prompt: Debug Template**
```
Debug my Gcore WebRTC streaming app.

Issue: [DESCRIBE PROBLEM]
Expected: [WHAT SHOULD HAPPEN]
Actual: [WHAT HAPPENS INSTEAD]

Code: [PASTE]
Console errors: [PASTE ERRORS]
Browser: [Chrome/Firefox/Safari + version]

Please:
1. Identify the root cause
2. Provide a fix
3. Explain why it happened
```

---

## Next Steps

1. **Try it now**: Open your AI assistant and use a prompt from this guide
2. **Start simple**: Use "Basic Streaming App" prompt above
3. **Iterate**: Add features one by one
4. **Reference**: Keep this guide open while developing

**Need help?**
- Check [examples/AI_USAGE_EXAMPLES.md](./examples/AI_USAGE_EXAMPLES.md) for complete code samples
- See [examples/COMMON_PATTERNS.md](./examples/COMMON_PATTERNS.md) for copy-paste patterns
- Read [DOCS.md](./DOCS.md) for technical details

**Pro tip**: Bookmark the [working Stackblitz demo](https://stackblitz.com/edit/stackblitz-starters-j2r9ar) and always reference it when asking AI for help.
