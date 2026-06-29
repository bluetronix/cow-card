import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginPage.vue')
    },
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('../views/DashboardPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/cows',
      name: 'CowList',
      component: () => import('../views/CowListPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/cows/new',
      name: 'NewCow',
      component: () => import('../views/CowFormPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/cows/:id',
      name: 'CowDetail',
      component: () => import('../views/CowDetailPage.vue')
    },
    {
      path: '/cows/:id/edit',
      name: 'EditCow',
      component: () => import('../views/CowFormPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/exports',
      name: 'Exports',
      component: () => import('../views/ExportPage.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const { isLoggedIn } = useAuth()
  if (to.meta.requiresAuth && !isLoggedIn()) {
    next('/login')
  } else {
    next()
  }
})

export default router
