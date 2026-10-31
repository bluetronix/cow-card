import { ref } from 'vue'
import { apiFetch } from '../db/api'

const STORAGE_KEY = 'cowcard_user'
const NAME_KEY = 'cowcard_fullname'

const currentUser = ref<string | null>(localStorage.getItem(STORAGE_KEY))
const fullName = ref<string | null>(localStorage.getItem(NAME_KEY))

function clearLocal() {
  currentUser.value = null
  fullName.value = null
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(NAME_KEY)
}

export function useAuth() {
  function login(username: string, name: string = '') {
    currentUser.value = username
    fullName.value = name || username
    localStorage.setItem(STORAGE_KEY, username)
    localStorage.setItem(NAME_KEY, name || username)
  }

  function logout() {
    clearLocal()
    void apiFetch('/auth/logout', { method: 'POST' }).catch(() => {})
  }

  function isLoggedIn(): boolean {
    return currentUser.value !== null
  }

  async function checkSession() {
    if (!currentUser.value) return
    try {
      const data = await apiFetch<{ user?: { username: string; full_name?: string } }>('/auth/me')
      if (data?.user) {
        currentUser.value = data.user.username
        fullName.value = data.user.full_name || data.user.username
        localStorage.setItem(STORAGE_KEY, currentUser.value)
        localStorage.setItem(NAME_KEY, fullName.value)
      }
    } catch (e: any) {
      if (e?.status === 401) clearLocal()
    }
  }

  return { currentUser, fullName, login, logout, isLoggedIn, checkSession }
}
