import useAuth from '~/composables/use-auth'

export default defineNuxtRouteMiddleware(
  (to) => {
    console.log('middleware/auth path:%s', to.path)
    if (to.path === '/host') {
      const auth = useAuth()
      console.log('middleware/auth %o', auth.value)
      if (!auth.value) {
        return abortNavigation(
          createError({
            statusCode: 401,
          }),
        )
      }
    }
  },
)
