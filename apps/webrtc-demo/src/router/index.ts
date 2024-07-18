import { createRouter, createWebHistory } from 'vue-router'
import WhipView from '../views/WhipView.vue'
import WhepView from '../views/WhepView.vue'
import SettingsView from '@/views/SettingsView.vue'
import ToolsView from '@/views/ToolsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/whip',
      name: 'whip',
      component: WhipView
    },
    {
      path: '/whep',
      name: 'whep',
      component: WhepView,
    },
    {
      path: '/settings',
      component: SettingsView,
    },
    {
      path: '/tools',
      component: ToolsView,
    },
    {
      path: '/',
      redirect: '/whip'
    }
  ]
})

export default router
