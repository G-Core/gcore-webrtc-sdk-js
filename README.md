# Gcore RTC kit

Javascript frontend SDK for building apps based on Gcore RTC platform [https://gcore.com/docs/streaming-platform/api/real-time-video-api-tutorial]

## Packages:
- [packages/rtckit](./packages/rtckit/README.md)
  Client-side library for streaming via the Gcore network using WebRTC.
- [packages/rtckit-node](./packages/rtckit-node/README.md)
  Server-side helper library to set up the WebRTC streaming

## Apps
- [apps/embedded-ingest-demo](./apps/embedded-ingest-demo/README.md)
  A minimalistic example on the use of the rtckit library to stream from a browser, plain JavaScript
- [apps/ingest-demo](./apps/ingest-demo/README.md)
  A small client-side **Vue.js** app, featuring WebRTC stream ingestion and playback
- [apps/ingest-demo-nuxt](./apps/ingest-demo-nuxt/README.md)
  A full-stack **Nuxt.js**-based example of ingesting WebRTC streams
- [apps/rtckit-node-demo](./apps/rtckit-node-demo/README.md)
  A primer on using the server-side library to initialize a WebRTC stream
- [apps/webrtc-demo](./apps/webrtc-demo)
  A demo app on a WebRTC stream ingestion and consumption. Not tied to the Gcore infrastructure,
  can be used to test any WebRTC server implementing WHIP and WHEP. **Vue.js**
