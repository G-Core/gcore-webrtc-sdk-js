import { readonly, ref } from "vue";

import { WebrtcStreaming, type WhipClientOptions } from "@gcorevideo/rtckit";

export const useWebrtcStreaming = (function () {
  const webrtc = new WebrtcStreaming("");
  return () => ({
    close() {
      webrtc.close();
    },
    init(endpoint: string, options?: WhipClientOptions) {
      webrtc.configure(endpoint, options);
    },
    webrtc,
  })
})();
