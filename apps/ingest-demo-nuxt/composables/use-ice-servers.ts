export default function useIceServers() {
  return useState<RTCIceServer[]>(
    'iceServers',
    () => [
      {
        urls: 'stun:ed-c16-95-128-175.fe.gc.onl',
      },
    ],
  )
}
