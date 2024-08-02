import {
  ApiKey,
  GcoreApi,
} from '@gcorevideo/rtckit-node'
import { WebrtcStream } from '@gcorevideo/rtckit-node/dist/WebrtcApi'

export default function gcoreApi() {
  const config = useRuntimeConfig()
  return new GcoreApi(
    new ApiKey(config.apiKey),
    config.apiHost
  )
}

export async function createWebrtcStream(
  name: string,
) {
  const webrtc = gcoreApi().webrtc
  // webrtc.setCustomOptions({
  //   ...
  // })
  return await webrtc.createStream(name)
}

export function webrtcStreamCreatedResponse(stream: WebrtcStream) {
  return {
    id: stream.id,
    playerUrl: stream.playerUrl,
    whepEndpoint: stream.whepEndpoint,
    whipEndpoint: stream.whipEndpoint,
  }
}
