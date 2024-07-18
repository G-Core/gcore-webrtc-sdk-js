import { WhipClient } from "@gcorevideo/rtckit/lib/whip";

export type WebrtcProduceParams = {
  endpoint: string
  auth?: string
  iceServers?: RTCIceServer[]
}

export const useWebrtcProducer = (function () {
  let client: WhipClient | null = null
  
  async function setup(params: WebrtcProduceParams) {
    if (client) {
      await client.close();
    }
    // TODO data channels
    client = new WhipClient(params.endpoint, {
      auth: params.auth,
      iceServers: params.iceServers,
      videoCodecs: ["H264"],
    })
  }

  async function close() {
    if (!client) {
      return
    }
    try {
      const c = client;
      client = null
      await c.close();
    } catch (e) {
      console.error("close failed:", e)
    }
  }

  async function start(stream: MediaStream): Promise<void> {
    if (!client) {
      throw new Error("WHIP client is not initialized")
    }
    await client.start(stream)
  }

  return () => ({
    close,
    setup,
    start,
  })
})()
