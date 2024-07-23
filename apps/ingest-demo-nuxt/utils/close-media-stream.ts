export default function closeMediaStream(
  s: MediaStream,
) {
  s.getTracks().forEach((t) => {
    s.removeTrack(t)
    t.stop()
  })
}
