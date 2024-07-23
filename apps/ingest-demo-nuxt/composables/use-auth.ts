export default function useAuth() {
  return tryUseAuth()
}

export function isAuthenticated() {
  return !!tryUseAuth().value
}

export function tryUseAuth() {
  return useState("auth", () => {
    const context = useRequestEvent()?.context
    console.log("tryUseAuth %o", context?.auth)
    return context?.auth
  })
}
