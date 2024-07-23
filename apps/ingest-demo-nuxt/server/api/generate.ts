import { defineEventHandler } from "h3"
import { ApiKey, GcoreApi } from '@gcorevideo/rtckit-node'

// Generate a live stream
export default defineEventHandler(
  async (event) => {
    const config = useRuntimeConfig()
    if (event.method === 'POST') {
      const { name } = await readBody(event)
      const api = new GcoreApi(
        new ApiKey(config.apiKey),
      )
      api.webrtc.setCustomOptions({
        qualitySetId: Number(config.qualitySetId) || null,
      })
      const { whipEndpoint, whepEndpoint, playerUrl } =
        await api.webrtc.createStream(
          name,
        )
      return {
        status: 201,
        body: {
          playerUrl,
          whepEndpoint,
          whipEndpoint,
        },
      }
    }
  },
)
