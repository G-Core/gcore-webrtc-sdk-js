import { createRouter, createWebHistory } from "vue-router"

import HostView from "../views/HostView.vue"
import GuestView from "../views/GuestView.vue"
import SettingsView from "../views/SettingsView.vue"
import PlayerView from "../views/PlayerView.vue"
import HowtoView from "../views/HowtoView.vue"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/guest",
      name: "guest",
      component: GuestView
    },
    {
      path: "/",
      name: "home",
      redirect: "/host"
    },
    {
      path: "/host",
      name: "host",
      component: HostView
    },
    {
      path: "/player",
      name: "player",
      component: PlayerView
    },
    {
      path: "/settings",
      name: "settings",
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: SettingsView
    }, {
      path: "/howto",
      name: "howto",
      component: HowtoView
    }
  ]
})

export default router
