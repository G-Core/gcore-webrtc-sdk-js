import useAuth from '~/composables/use-auth'

export default defineNuxtRouteMiddleware(
  (to) => {
    // Prevent navigation to /host if not authenticated
    // Implement your custom authorization route guards here
    if (to.path === '/host') {
      const auth = useAuth()
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
