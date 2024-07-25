import { defineEventHandler } from 'h3'

import gcore, {
  createWebrtcStream,
  webrtcStreamCreatedResponse,
} from '../utils/gcore-api'
import { GcoreApiError } from '@gcorevideo/rtckit-node'

export default defineEventHandler(
  async (event) => {
    const body = await readBody(event)
    const id = body?.id
    if (!id) {
      throw createError({
        status: 400,
      })
    }
    try {
      await gcore().webrtc.toggleStream(
        id,
        true,
      )
      return {
        status: 204,
      }
    } catch (e) {
      if (e instanceof GcoreApiError) {
        if (
          e.status === 404 &&
          body.name
        ) {
          return createWebrtcStream(
            body.name,
          ).then((stream) =>
            webrtcStreamCreatedResponse(
              stream,
            ),
          )
        }
        return createError(e)
      }
    }
    return createError({
      statusCode: 500,
    })
  },
)
