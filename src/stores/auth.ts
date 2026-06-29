import { ref } from 'vue'

const STORAGE_KEY = 'cowcard_user'
const NAME_KEY = 'cowcard_fullname'

const currentUser = ref<string | null>(localStorage.getItem(STORAGE_KEY))
const fullName = ref<string | null>(localStorage.getItem(NAME_KEY))

export function useAuth() {
  function login(username: string, name: string = '') {
    currentUser.value = username
    fullName.value = name || username
    localStorage.setItem(STORAGE_KEY, username)
    localStorage.setItem(NAME_KEY, name || username)
  }

  function logout() {
    currentUser.value = null
    fullName.value = null
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(NAME_KEY)
  }

  function isLoggedIn(): boolean {
    return currentUser.value !== null
  }

  return { currentUser, fullName, login, logout, isLoggedIn }
}
