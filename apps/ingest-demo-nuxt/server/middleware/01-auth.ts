export default defineEventHandler(
  (event) => {
    const token = getQuery(event).token
     // TODO parse & verify
    console.log("01-auth token:%s", token)
    event.context.auth = token ? { token } : null
  },
)
