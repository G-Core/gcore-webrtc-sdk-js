import { defineEventHandler } from "h3"

import gcore from '../utils/gcore-api'

// Generate a live stream
export default defineEventHandler(
  async (event) => {
    const config = useRuntimeConfig()
    const { name } = await readBody(event)
      const webrtc = gcore().webrtc
      webrtc.setCustomOptions({
        qualitySetId: Number(config.qualitySetId) || null,
      })
      const { id, whipEndpoint, whepEndpoint, playerUrl } =
        await webrtc.createStream(
          name,
        )
      return {
        status: 201,
        body: {
          id,
          playerUrl,
          whepEndpoint,
          whipEndpoint,
        },
      }
  },
)
