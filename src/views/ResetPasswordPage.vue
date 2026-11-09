<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetPassword } from '../db/account'
import { formatError } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const token = String(route.query.token || '')
const password = ref('')
const confirm = ref('')
const loading = ref(false)
const done = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!token) { error.value = 'Missing reset token'; return }
  if (password.value.length < 8) { error.value = 'Password must be at least 8 characters'; return }
  if (password.value !== confirm.value) { error.value = 'Passwords do not match'; return }
  loading.value = true
  try {
    await resetPassword(token, password.value)
    done.value = true
  } catch (e: any) {
    error.value = e?.status ? (e.message || 'Reset failed') : formatError(e, 'Reset failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <header>
        <h1>Reset password</h1>
        <p>Choose a new password for your account.</p>
      </header>

      <div v-if="done">
        <p class="success">Your password has been reset. Sign in with the new password.</p>
        <button class="primary" @click="router.push('/login')">Go to sign in</button>
      </div>

      <form v-else @submit.prevent="submit">
        <label>New password</label>
        <input v-model="password" type="password" autocomplete="new-password" required />
        <label>Confirm new password</label>
        <input v-model="confirm" type="password" autocomplete="new-password" required />
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading">{{ loading ? 'Resetting...' : 'Reset password' }}</button>
      </form>

      <button v-if="!done" class="link" @click="router.push('/login')">Back to sign in</button>
    </div>
  </div>
</template>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0b2b3e, #1a5276); padding: 24px; }
.auth-card { width: 100%; max-width: 420px; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,.2); }
header { margin-bottom: 20px; }
h1 { margin: 0 0 6px; color: #1a5276; font-size: 1.4rem; }
header p { margin: 0; color: #666; font-size: .9rem; }
form { display: flex; flex-direction: column; gap: 10px; }
label { font-size: .8rem; font-weight: 700; color: #444; text-transform: uppercase; letter-spacing: .5px; }
input { padding: 11px 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem; }
input:focus { outline: none; border-color: #1a5276; }
button[type=submit], .primary { margin-top: 6px; padding: 11px; border: none; border-radius: 8px; background: #1a5276; color: #fff; font-weight: 700; cursor: pointer; }
button[type=submit]:disabled { opacity: .6; cursor: not-allowed; }
.error { color: #b91c1c; font-size: .85rem; margin: 4px 0 0; }
.success { color: #166534; font-size: .9rem; line-height: 1.5; }
.link { margin-top: 16px; background: none; border: none; color: #1a5276; cursor: pointer; font-size: .9rem; padding: 0; }
</style>
