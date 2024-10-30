import { useWebrtcStreaming } from "./webrtcStreaming";

export type WebrtcProduceParams = {
  endpoint: string
  auth?: string
  iceServers?: RTCIceServer[]
}

export const useWebrtcProducer = (function () {
  const {
    close: closeClient,
    webrtc,
    init: initClient,
  } = useWebrtcStreaming();
  
  async function setup(params: WebrtcProduceParams) {
    closeClient()
    initClient(params.endpoint, {
      auth: params.auth,
      iceServers: params.iceServers,
      videoCodecs: ["H264"],
    })
  }

  // async function close() {
  //   if (!client) {
  //     return
  //   }
  //   try {
  //     const c = client;
  //     client = null
  //     await c.close();
  //   } catch (e) {
  //     console.error("close failed:", e)
  //   }
  // }

  async function start(stream: MediaStream): Promise<void> {
    setTracks(stream)
    await webrtc.run()
  }

  async function setTracks(stream: MediaStream): Promise<void> {
    // TODO
  }

  return () => ({
    close,
    setup,
    setTracks,
    start,
  })
})()
