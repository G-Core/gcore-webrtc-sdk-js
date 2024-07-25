import type { StreamInfo } from "~/types/stream"

const STREAM_NAME = 'My damn awesome WebRTC stream'

export default async function useStream() {
  const cookie =
    useCookie<StreamInfo>('stream')
  if (!cookie.value || !cookie.value?.id) {
    const { data } = await useFetch(
      '/api/generate',
      {
        method: 'POST',
        body: {
          name: STREAM_NAME,
        }
      },
    )
    if (!data.value) {
      throw new Error(
        'Failed to create stream',
      )
    }
    cookie.value = data.value.body
  } else {
    await useFetch('/api/keepalive', {
      method: 'POST',
      body: {
        id: cookie.value.id,
        name: STREAM_NAME,
      },
    })
  }
  return cookie.value
}
