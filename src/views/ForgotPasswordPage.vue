<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { forgotPassword } from '../db/account'
import { formatError } from '../composables/useToast'

const router = useRouter()
const email = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')

async function submit() {
  error.value = ''
  message.value = ''
  if (!email.value.trim()) {
    error.value = 'Enter your email address'
    return
  }
  loading.value = true
  try {
    const result = await forgotPassword(email.value.trim())
    message.value = result.message || 'If an account exists, a reset link was sent.'
  } catch (e: any) {
    error.value = e?.status ? (e.message || 'Request failed') : formatError(e, 'Could not send the request')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <header>
        <h1>Forgot password</h1>
        <p>Enter the email on your account.</p>
      </header>

      <form @submit.prevent="submit">
        <label>Email</label>
        <input v-model="email" type="email" placeholder="you@example.com" autocomplete="email" required />
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="message" class="success">{{ message }}</p>
        <button type="submit" :disabled="loading">{{ loading ? 'Sending...' : 'Send reset link' }}</button>
      </form>

      <button class="link" @click="router.push('/login')">Back to sign in</button>
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
button[type=submit] { margin-top: 6px; padding: 11px; border: none; border-radius: 8px; background: #1a5276; color: #fff; font-weight: 700; cursor: pointer; }
button[type=submit]:disabled { opacity: .6; cursor: not-allowed; }
.error { color: #b91c1c; font-size: .85rem; margin: 4px 0 0; }
.success { color: #166534; font-size: .85rem; margin: 4px 0 0; }
.link { margin-top: 16px; background: none; border: none; color: #1a5276; cursor: pointer; font-size: .9rem; padding: 0; }
</style>
