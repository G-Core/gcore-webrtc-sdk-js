import type { StreamInfo } from "~/types/stream"

export default async function useStream() {
  const cookie =
    useCookie<StreamInfo>('stream')
  if (!cookie.value) {
    const { data } = await useFetch(
      '/api/generate',
      {
        method: 'POST',
        body: {
          name: 'My damn awesome WebRTC stream',
        }
      },
    )
    if (!data.value) {
      throw new Error(
        'Failed to create stream',
      )
    }
    cookie.value = data.value.body
  }
  return cookie.value
}
