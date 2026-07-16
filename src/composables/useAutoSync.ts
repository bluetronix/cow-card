import { ref, onMounted, onUnmounted } from 'vue'
import { syncPendingRecords, getPendingCount } from '../utils/sync'
import { showToast } from './useToast'

const lastSynced = ref<string | null>(null)
const isOnline = ref(navigator.onLine)
let intervalId: ReturnType<typeof setInterval> | null = null

function updateOnlineStatus() {
  isOnline.value = navigator.onLine
}

export function useAutoSync() {
  onMounted(() => {
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', updateOnlineStatus)
    isOnline.value = navigator.onLine
  })

  onUnmounted(() => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', updateOnlineStatus)
    stopAutoSync()
  })

  return { lastSynced, isOnline, startAutoSync, stopAutoSync, syncNow }
}

async function onOnline() {
  updateOnlineStatus()
  const pending = await getPendingCount()
  const total = pending.cows + pending.daily + pending.vetVisits + pending.incidents + pending.treatments + pending.lameness + pending.vaccinations
  if (total > 0) {
    showToast(`Connection restored — syncing ${total} item(s)`, 'info')
    await syncNow()
  }
}

async function syncNow() {
  try {
    const res = await syncPendingRecords()
    const total = res.cows + res.daily + res.vetVisits + res.incidents + res.treatments + res.lameness + res.vaccinations
    if (total > 0) {
      showToast(`Auto-synced ${total} item(s)`, 'success')
    }
    lastSynced.value = new Date().toISOString()
  } catch {
    lastSynced.value = new Date().toISOString()
  }
}

function startAutoSync(intervalMs = 300000) {
  if (intervalId) return
  syncNow()
  intervalId = setInterval(() => {
    if (navigator.onLine) syncNow()
  }, intervalMs)
}

function stopAutoSync() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}
