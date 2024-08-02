import './assets/main.css'

import { createApp } from 'vue'
import pkg from "../package.json" with { type: "json" };
import App from './App.vue'
import router from './router'

import { setTracer } from '@gcorevideo/rtckit';
import { LogTracer } from '@gcorevideo/rtckit';

console.log(
    `${pkg.name} ${
      import.meta.env.VITE_APP_VERSION
    }`,
  )

setTracer(new LogTracer());

const app = createApp(App)

app.use(router)

app.mount('#app')
