import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import pkg from "../package.json" with { type: "json" };

import App from './App.vue'
import router from './router'

console.log(
  `${pkg.name} ${
    import.meta.env.VITE_APP_VERSION
  }`,
)

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
