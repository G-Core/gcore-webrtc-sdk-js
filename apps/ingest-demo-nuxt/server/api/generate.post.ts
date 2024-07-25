import { defineEventHandler } from 'h3'

import { createWebrtcStream, webrtcStreamCreatedResponse } from '../utils/gcore-api'

// Generate a live stream
export default defineEventHandler(
  async (event) => {
    const { name } = await readBody(
      event,
    )
    const stream = await createWebrtcStream(name)
    return webrtcStreamCreatedResponse(stream)
  },
)
