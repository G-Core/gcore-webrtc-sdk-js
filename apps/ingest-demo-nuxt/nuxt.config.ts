// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  // ssr
  runtimeConfig: {
    // The private keys which are only available within server-side
    apiKey: '',
    qualitySetId: '',
    public: {
      appVersion: '',
    },
  },
})
