import {
  WebrtcReporter,
} from '@gcorevideo/rtckit'
import type { WebrtcConciseReport } from '@gcorevideo/rtckit/lib/stats/types'

export async function useWebrtcStats(
  roomId: string,
  peerId: string,
  mediaServer?: string,
) {
  try {
    const reporter = new WebrtcReporter((_: WebrtcConciseReport) => Promise.resolve());
    reporter.init()
    return () => reporter.destroy()
  } catch (e) {
    console.error(e)
    return () => {}
  }
}
