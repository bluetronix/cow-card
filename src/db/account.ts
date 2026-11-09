import { apiFetch } from './api'

export interface Account {
  id: string
  username: string
  full_name: string
  email: string
  email_verified: boolean
  created_at: string
}

export interface SessionInfo {
  id: string
  created_at: string
  last_seen_at: string
  expires_at: string
  user_agent: string
  ip: string
  current: boolean
}

export async function getAccount(): Promise<Account> {
  const data = await apiFetch<{ account: Account }>('/account')
  return data.account
}

export async function requestEmailChange(email: string): Promise<{ message?: string }> {
  return apiFetch('/account/email', {
    method: 'PUT',
    body: JSON.stringify({ email }),
  })
}

export async function resendVerification(): Promise<{ message?: string }> {
  return apiFetch('/account/resend-verification', { method: 'POST' })
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  await apiFetch('/account/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  })
}

export async function listSessions(): Promise<SessionInfo[]> {
  const data = await apiFetch<{ sessions: SessionInfo[] }>('/account/sessions')
  return data.sessions || []
}

export async function revokeSession(id: string): Promise<void> {
  await apiFetch(`/account/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function forgotPassword(email: string): Promise<{ message?: string }> {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export async function verifyEmail(token: string): Promise<{ email?: string }> {
  return apiFetch('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}
