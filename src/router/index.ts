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
      component: () => import('../views/CowDetailPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/public/cows/:id',
      name: 'PublicCow',
      component: () => import('../views/PublicCowPage.vue')
    },
    {
      path: '/cows/:id/edit',
      name: 'EditCow',
      component: () => import('../views/CowFormPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/cows/:id/print-card',
      name: 'CardPrint',
      component: () => import('../views/CardPrintView.vue'),
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
    {
      path: '/account',
      name: 'Account',
      component: () => import('../views/AccountPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forgot-password',
      name: 'ForgotPassword',
      component: () => import('../views/ForgotPasswordPage.vue')
    },
    {
      path: '/reset-password',
      name: 'ResetPassword',
      component: () => import('../views/ResetPasswordPage.vue')
    },
    {
      path: '/verify-email',
      name: 'VerifyEmail',
      component: () => import('../views/VerifyEmailPage.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/NotFoundPage.vue')
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
