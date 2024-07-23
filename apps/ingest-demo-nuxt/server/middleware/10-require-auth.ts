const T = "require-auth";

export default defineEventHandler(
  (e) => {
    // Implement authorization according to the app business logic
    if (e.path !== '/host') {
      return
    }
    if (!e.context.auth) {
      throw createError({
        statusCode: 401,
      })
    }
  },
)
