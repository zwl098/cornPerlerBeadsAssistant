import { createRouter, createWebHistory } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import HomePage from '@/pages/HomePage.vue'
import WorkspacePage from '@/pages/WorkspacePage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/w',
      name: 'workspace',
      component: WorkspacePage,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  if (to.name !== 'workspace') return true
  const project = useProjectStore()
  if (!project.hasImage) return { name: 'home' }
  return true
})

export default router
