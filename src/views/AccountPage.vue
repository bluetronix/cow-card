<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import {
  changePassword,
  getAccount,
  listSessions,
  requestEmailChange,
  resendVerification,
  revokeSession,
  type Account,
  type SessionInfo,
} from '../db/account'
import { logoutAllUser } from '../db/turso'
import { formatError, showConfirm, showToast } from '../composables/useToast'

const router = useRouter()
const { logout } = useAuth()

const account = ref<Account | null>(null)
const sessions = ref<SessionInfo[]>([])
const loading = ref(true)

const emailInput = ref('')
const emailBusy = ref(false)
const verifyBusy = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordBusy = ref(false)

const sessionBusy = ref(false)

const emailVerified = computed(() => Boolean(account.value?.email && account.value.email_verified))

function errorText(error: any, fallback: string) {
  return error?.status ? (error.message || fallback) : formatError(error, fallback)
}

function formatDateTime(value: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

async function load() {
  try {
    const [nextAccount, nextSessions] = await Promise.all([getAccount(), listSessions()])
    account.value = nextAccount
    emailInput.value = nextAccount.email
    sessions.value = nextSessions
  } catch (error) {
    showToast(errorText(error, 'Failed to load account'), 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function saveEmail() {
  const email = emailInput.value.trim().toLowerCase()
  if (!email) {
    showToast('Enter an email address', 'warning')
    return
  }
  emailBusy.value = true
  try {
    const result = await requestEmailChange(email)
    showToast(result.message || 'Verification email sent', 'success')
    await load()
  } catch (error) {
    showToast(errorText(error, 'Failed to update email'), 'error')
  } finally {
    emailBusy.value = false
  }
}

async function sendVerification() {
  verifyBusy.value = true
  try {
    const result = await resendVerification()
    showToast(result.message || 'Verification email sent', 'success')
  } catch (error) {
    showToast(errorText(error, 'Failed to send verification email'), 'error')
  } finally {
    verifyBusy.value = false
  }
}

async function savePassword() {
  if (newPassword.value.length < 8) {
    showToast('New password must be at least 8 characters', 'warning')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    showToast('New passwords do not match', 'warning')
    return
  }
  passwordBusy.value = true
  try {
    await changePassword(currentPassword.value, newPassword.value)
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    showToast('Password changed. Other sessions were signed out.', 'success')
    await load()
  } catch (error) {
    showToast(errorText(error, 'Failed to change password'), 'error')
  } finally {
    passwordBusy.value = false
  }
}

function removeSession(session: SessionInfo) {
  const revoke = async () => {
    sessionBusy.value = true
    try {
      await revokeSession(session.id)
      if (session.current) {
        logout()
        router.push('/login')
        return
      }
      showToast('Session revoked', 'success')
      await load()
    } catch (error) {
      showToast(errorText(error, 'Failed to revoke session'), 'error')
    } finally {
      sessionBusy.value = false
    }
  }

  if (session.current) {
    showConfirm(
      'Sign out this device',
      'This will revoke your current session and send you to the login page.',
      revoke,
      'Sign out',
    )
  } else {
    void revoke()
  }
}

function logoutEverywhere() {
  showConfirm(
    'Log out all devices',
    'This revokes every active session for your account.',
    async () => {
      await logoutAllUser()
      logout()
      router.push('/login')
      showToast('All sessions revoked', 'success')
    },
    'Log out all',
  )
}
</script>

<template>
  <div class="account-page">
    <header class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/')">← Dashboard</button>
        <h1>Account</h1>
      </div>
      <button class="btn-logout-all" @click="logoutEverywhere">Log out all devices</button>
    </header>

    <div v-if="loading" class="loading">Loading account...</div>

    <div v-else-if="!account" class="loading">Account not available.</div>

    <div v-else class="content">
      <section class="card">
        <h2>Profile</h2>
        <div class="rows">
          <div><span>Username</span><strong>{{ account.username }}</strong></div>
          <div><span>Full name</span><strong>{{ account.full_name || '—' }}</strong></div>
          <div>
            <span>Email</span>
            <strong>
              {{ account.email || 'Not set' }}
              <em v-if="account.email" :class="['badge', emailVerified ? 'ok' : 'pending']">
                {{ emailVerified ? 'Verified' : 'Unverified' }}
              </em>
            </strong>
          </div>
        </div>

        <div class="form-block">
          <h3>{{ account.email ? 'Change email' : 'Add email' }}</h3>
          <p class="hint">
            Password recovery requires a verified email. Your current email stays active until the new one is verified.
          </p>
          <div class="inline-form">
            <input v-model="emailInput" type="email" placeholder="you@example.com" autocomplete="email" />
            <button :disabled="emailBusy" @click="saveEmail">
              {{ emailBusy ? 'Sending...' : 'Send verification' }}
            </button>
          </div>
          <button
            v-if="account.email && !emailVerified"
            class="btn-secondary"
            :disabled="verifyBusy"
            @click="sendVerification"
          >
            {{ verifyBusy ? 'Sending...' : 'Resend verification email' }}
          </button>
        </div>
      </section>

      <section class="card">
        <h2>Change password</h2>
        <div class="password-form">
          <label>Current password<input v-model="currentPassword" type="password" autocomplete="current-password" /></label>
          <label>New password<input v-model="newPassword" type="password" autocomplete="new-password" /></label>
          <label>Confirm new password<input v-model="confirmPassword" type="password" autocomplete="new-password" /></label>
          <button :disabled="passwordBusy" @click="savePassword">
            {{ passwordBusy ? 'Updating...' : 'Change password' }}
          </button>
        </div>
      </section>

      <section class="card">
        <h2>Active sessions</h2>
        <div v-if="sessions.length === 0" class="empty">No active sessions.</div>
        <div v-else class="session-list">
          <div v-for="session in sessions" :key="session.id" class="session-row">
            <div class="session-main">
              <strong>
                {{ session.user_agent || 'Unknown device' }}
                <span v-if="session.current" class="badge ok">This device</span>
              </strong>
              <span>Created {{ formatDateTime(session.created_at) }} · Last seen {{ formatDateTime(session.last_seen_at) }}</span>
              <span v-if="session.ip">IP {{ session.ip }}</span>
            </div>
            <button class="btn-revoke" :disabled="sessionBusy" @click="removeSession(session)">
              Revoke
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.account-page { min-height: 100vh; background: #f0f2f5; padding-bottom: 40px; }
.page-header { background: #fff; padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; gap: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.page-header h1 { margin: 0; font-size: 1.4rem; color: #333; }
.btn-back { background: none; border: none; color: #1a5276; font-size: .9rem; cursor: pointer; padding: 0; margin-bottom: 8px; display: block; }
.btn-logout-all { padding: 9px 16px; border: none; border-radius: 8px; background: #b91c1c; color: #fff; font-weight: 600; cursor: pointer; }
.loading { text-align: center; padding: 60px; color: #999; }
.content { max-width: 900px; margin: 0 auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 18px; }
.card { background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 6px rgba(0,0,0,.06); }
.card h2 { margin: 0 0 14px; font-size: 1.05rem; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }
.rows { display: grid; gap: 8px; margin-bottom: 18px; }
.rows > div { display: flex; justify-content: space-between; gap: 16px; font-size: .9rem; border-bottom: 1px solid #f5f5f5; padding-bottom: 7px; }
.rows span { color: #777; }
.rows strong { color: #333; font-weight: 600; text-align: right; }
.badge { display: inline-block; margin-left: 8px; padding: 1px 8px; border-radius: 10px; font-size: .7rem; font-style: normal; font-weight: 700; }
.badge.ok { background: #d4edda; color: #155724; }
.badge.pending { background: #fef3c7; color: #92400e; }
.form-block { border-top: 1px solid #f0f0f0; padding-top: 14px; }
.form-block h3 { margin: 0 0 4px; font-size: .95rem; color: #333; }
.hint { margin: 0 0 10px; color: #777; font-size: .82rem; line-height: 1.4; }
.inline-form { display: flex; gap: 8px; flex-wrap: wrap; }
.inline-form input { flex: 1; min-width: 220px; padding: 9px 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: .95rem; }
.inline-form button, .password-form button { padding: 9px 16px; border: none; border-radius: 8px; background: #1a5276; color: #fff; font-weight: 600; cursor: pointer; }
.inline-form button:disabled, .password-form button:disabled { opacity: .6; cursor: not-allowed; }
.btn-secondary { margin-top: 10px; padding: 8px 14px; border: 1px solid #1a5276; border-radius: 8px; background: #fff; color: #1a5276; font-weight: 600; cursor: pointer; }
.password-form { display: flex; flex-direction: column; gap: 10px; max-width: 460px; }
.password-form label { display: flex; flex-direction: column; gap: 4px; font-size: .8rem; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: .4px; }
.password-form input { padding: 9px 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: .95rem; }
.password-form input:focus, .inline-form input:focus { outline: none; border-color: #1a5276; }
.session-list { display: flex; flex-direction: column; gap: 10px; }
.session-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px; border: 1px solid #eee; border-radius: 8px; }
.session-main { display: flex; flex-direction: column; gap: 3px; font-size: .85rem; color: #777; }
.session-main strong { color: #333; font-size: .9rem; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.btn-revoke { padding: 6px 12px; border: 1px solid #b91c1c; border-radius: 8px; background: #fff; color: #b91c1c; font-weight: 600; cursor: pointer; }
.btn-revoke:disabled { opacity: .6; cursor: not-allowed; }
.empty { color: #999; text-align: center; padding: 20px; }
@media (max-width: 640px) {
  .page-header { padding: 12px 16px; flex-wrap: wrap; }
  .content { padding: 12px; }
  .session-row { align-items: flex-start; }
  .btn-logout-all { width: 100%; }
}
</style>
