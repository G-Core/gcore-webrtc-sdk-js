import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import { setTracer } from '@gcorevideo/rtckit';
import { LogTracer } from '@gcorevideo/rtckit';

console.log(
    `version: ${
      import.meta.env.VITE_APP_VERSION
    }`,
  )

setTracer(new LogTracer());

const app = createApp(App)

app.use(router)

app.mount('#app')
