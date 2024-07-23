export default function useAuth() {
  return useState("auth", () => {
    // Get the request auth context from the server-side
    // See ../server/middleware/01-auth.ts
    const context = useRequestEvent()?.context
    return context?.auth
  })
}
