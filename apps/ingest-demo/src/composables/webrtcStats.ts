import {
  ApiClient,
  WebrtcReporter,
} from '@gcorevideo/rtckit'

export async function useWebrtcStats(
  roomId: string,
  peerId: string,
  mediaServer?: string,
) {
  const apiClient = new ApiClient({
    host: import.meta.env.VITE_API_HOST,
    clientHost: 'meet.gcorelabs.com',
  })
  try {
    const { token } =
      await apiClient.initSession({
        roomId,
        peerId,
      })
    const reporter = new WebrtcReporter(
      apiClient.service,
      mediaServer,
    )
    reporter.init(token)
    return () => reporter.destroy()
  } catch (e) {
    console.error(e)
    return () => {}
  }
}
