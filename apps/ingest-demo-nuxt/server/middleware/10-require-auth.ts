const T = "require-auth";

export default defineEventHandler(
  (e) => {
    console.log(`${T} path:%s`, e.path)
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
