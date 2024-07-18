# Gcore server-side WebRTC SDK

## Usage

### 1. Install

```
npm i @gcorevideo/rtckit-node
```

### 2. Get your API Key

https://api.gcore.com/docs/iam#section/Authentication


### 3. Use it

```
const rtckit = await import("@gcorevideo/rtckit-node");

const apiKey = new rtckit.ApiKey("4887$deadbeef...");
const api = new rtckit.GcoreApi(apiKey);
const stream = await api.webrtc.createStream("My WebRTC broadcast");
console.log(stream);
...
await api.webrtc.deleteStream(stream.id);
```
