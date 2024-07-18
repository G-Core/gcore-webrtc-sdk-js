import { createRouter, createWebHistory } from "vue-router"
import IntroRoom from "@/views/IntroRoom.vue"
import CallRoom from "@/views/CallRoom.vue"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "intro",
      component: IntroRoom
    },
    {
      path: "/call/:roomId",
      name: "room",
      component: CallRoom
    }
  ]
})

export default router
