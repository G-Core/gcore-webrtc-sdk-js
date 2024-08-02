import type { StreamInfo } from "~/types/stream"

const STREAM_NAME = 'My damn awesome WebRTC stream'

export default async function useStream() {
  const cookie =
    useCookie<StreamInfo>('stream')
  const { data } = await fetchStream(cookie.value);
  if (data.value) {
    // @ts-ignore
    cookie.value = data.value
  }
  if (!cookie.value) {
    throw new Error(
      'Failed to create stream',
    )
  }
  return cookie.value
}

async function fetchStream(value: StreamInfo | undefined) {
  if (!value || !value.id) {
    return useFetch(
     '/api/generate',
     {
       method: 'POST',
       body: {
         name: STREAM_NAME,
       }
     },
   )
  }
  return useFetch('/api/keepalive', {
    method: 'POST',
    body: {
      id: value.id,
      name: STREAM_NAME,
    },
  })
}
