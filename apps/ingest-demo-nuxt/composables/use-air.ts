export default function useLive() {
  return useState('live', () => ({
    live: false,
    ended: false,
  }))
}
