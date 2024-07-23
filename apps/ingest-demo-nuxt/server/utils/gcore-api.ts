import { ApiKey, GcoreApi } from '@gcorevideo/rtckit-node'

export default function gcoreApi() {
  const config = useRuntimeConfig()
  return new GcoreApi(
    new ApiKey(config.apiKey),
  )
}