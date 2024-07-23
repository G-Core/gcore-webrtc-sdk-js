export default defineEventHandler(
  (event) => {
    const token = getQuery(event).token
     // Parse/decode/verify token according to your app-specific authentication strategy
    event.context.auth = token ? { token } : null
  },
)
