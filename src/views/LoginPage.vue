<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import { loginUser, registerUser } from '../db/turso'

const router = useRouter()
const { login } = useAuth()

const isRegister = ref(false)
const username = ref('')
const fullName = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = 'Please fill all fields'
    return
  }
  if (isRegister.value && password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  loading.value = true
  try {
    if (isRegister.value) {
      const result = await registerUser(
        crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        username.value,
        password.value,
        fullName.value
      )
      if (!result.success) {
        error.value = result.error
        return
      }
      login(result.username, result.full_name)
    } else {
      const result = await loginUser(username.value, password.value)
      if (!result.success) {
        error.value = result.error
        return
      }
      login(result.username, result.full_name)
    }
    router.push('/')
  } catch {
    error.value = 'Connection error. Check your network.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1>🐄 Bashe Dairy Farm</h1>
        <p>{{ isRegister ? 'Create Account' : 'Sign In' }}</p>
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label>Username</label>
          <input
            v-model="username"
            type="text"
            placeholder="Enter username"
            required
          />
        </div>

        <div v-if="isRegister" class="form-group">
          <label>Full Name</label>
          <input
            v-model="fullName"
            type="text"
            placeholder="Enter full name"
          />
        </div>
        
        <div class="form-group">
          <label>Password</label>
          <input
            v-model="password"
            type="password"
            placeholder="Enter password"
            required
          />
        </div>

        <div v-if="isRegister" class="form-group">
          <label>Confirm Password</label>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm password"
            required
          />
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Please wait...' : isRegister ? 'Register' : 'Sign In' }}
        </button>
      </form>

      <p class="toggle-text">
        {{ isRegister ? 'Already have an account?' : "Don't have an account?" }}
        <button class="link-btn" @click="isRegister = !isRegister">
          {{ isRegister ? 'Sign In' : 'Register' }}
        </button>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #0b2b3e 0%, #1a5276 100%);
}

.login-card {
  background: #fff;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  font-size: 1.5rem;
  color: #1a5276;
  margin: 0 0 8px;
}

.login-header p {
  color: #666;
  font-size: 1rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input {
  padding: 10px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  border-color: #1a5276;
  outline: none;
}

.btn-primary {
  padding: 12px;
  background: #1a5276;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #0b2b3e;
}

.btn-primary:disabled {
  background: #999;
  cursor: not-allowed;
}

.error-msg {
  color: #d32f2f;
  font-size: 0.85rem;
  text-align: center;
  margin: 0;
}

.toggle-text {
  text-align: center;
  margin-top: 20px;
  color: #666;
  font-size: 0.9rem;
}

.link-btn {
  background: none;
  border: none;
  color: #1a5276;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .login-card {
    padding: 24px 20px;
    margin: 16px;
    max-width: none;
    width: auto;
  }
  .login-header h1 {
    font-size: 1.2rem;
  }
  .login-header p {
    font-size: 0.9rem;
  }
  .login-header {
    margin-bottom: 20px;
  }
  .btn-primary {
    padding: 14px;
    font-size: 1rem;
  }
}
</style>
