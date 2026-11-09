<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { verifyEmail } from '../db/account'
import { formatError } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const token = String(route.query.token || '')
const state = ref<'loading' | 'success' | 'error'>('loading')
const email = ref('')
const error = ref('')

onMounted(async () => {
  if (!token) { state.value = 'error'; error.value = 'Missing verification token'; return }
  try {
    const result = await verifyEmail(token)
    email.value = result.email || ''
    state.value = 'success'
  } catch (e: any) {
    state.value = 'error'
    error.value = e?.status ? (e.message || 'Verification failed') : formatError(e, 'Verification failed')
  }
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div v-if="state === 'loading'" class="state">Verifying your email...</div>
      <div v-else-if="state === 'success'">
        <h1>Email verified</h1>
        <p class="success">{{ email }} is now verified. Password recovery is enabled.</p>
        <button class="primary" @click="router.push('/login')">Go to sign in</button>
      </div>
      <div v-else>
        <h1>Verification failed</h1>
        <p class="error">{{ error }}</p>
        <button class="primary" @click="router.push('/login')">Back to sign in</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0b2b3e, #1a5276); padding: 24px; }
.auth-card { width: 100%; max-width: 420px; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,.2); text-align: center; }
h1 { margin: 0 0 10px; color: #1a5276; font-size: 1.4rem; }
.state { color: #666; }
.success { color: #166534; line-height: 1.5; }
.error { color: #b91c1c; line-height: 1.5; }
.primary { margin-top: 16px; padding: 11px 18px; border: none; border-radius: 8px; background: #1a5276; color: #fff; font-weight: 700; cursor: pointer; }
</style>
