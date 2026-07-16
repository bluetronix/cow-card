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
      path: '/daily',
      name: 'DailyData',
      component: () => import('../views/DailyDataPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/exports',
      name: 'Exports',
      component: () => import('../views/ExportPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/herd-summary',
      name: 'HerdSummary',
      component: () => import('../views/HerdSummaryPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/vet',
      name: 'VetDashboard',
      component: () => import('../views/VetDashboardPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/vet/cows/:id',
      name: 'VetCowProfile',
      component: () => import('../views/VetCowProfilePage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/vet/lameness',
      name: 'VetLameness',
      component: () => import('../views/VetLamenessPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/vet/visits',
      name: 'VetVisits',
      component: () => import('../views/VetVisitsPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/vet/incidents',
      name: 'VetIncidents',
      component: () => import('../views/VetIncidentsPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/vet/treatments',
      name: 'VetTreatments',
      component: () => import('../views/VetTreatmentsPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/vet/vaccinations',
      name: 'VetVaccinations',
      component: () => import('../views/VetVaccinationsPage.vue'),
      meta: { requiresAuth: true }
    },
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
