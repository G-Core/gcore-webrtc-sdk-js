import {
  defineEventHandler,
  setResponseStatus,
} from 'h3'

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
      setResponseStatus(event, 204)
      return null
    } catch (e) {
      if (e instanceof GcoreApiError) {
        if (
          e.status === 404 &&
          body.name
        ) {
          console.warn(
            'keepalive stream %s not found, creating a new one',
            id,
          )
          return createWebrtcStream(
            body.name,
          ).then((stream) => {
            setResponseStatus(
              event,
              201,
            )
            return webrtcStreamCreatedResponse(
              stream,
            )
          })
        }
        return createError(e)
      }
    }
    return createError({
      statusCode: 500,
    })
  },
)
