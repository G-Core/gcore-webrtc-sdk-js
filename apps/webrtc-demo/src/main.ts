import './assets/main.css'

import { createApp } from 'vue'
import pkg from "../package.json" with { type: "json" };
import App from './App.vue'
import router from './router'

import { LogTracer, Logger, setTracer } from '@gcorevideo/rtckit';

console.log(
    `${pkg.name} ${
      import.meta.env.VITE_APP_VERSION
    }`,
  )

Logger.enable(localStorage.getItem("debug") || "*:ERROR:*,*:WARN:*");
setTracer(new LogTracer());

const app = createApp(App)

app.use(router)

app.mount('#app')
