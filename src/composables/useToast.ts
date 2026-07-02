import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration: number
}

const toasts = ref<Toast[]>([])
let nextId = 0

export function showToast(
  message: string,
  type: Toast['type'] = 'info',
  duration = 4000
) {
  const id = nextId++
  toasts.value.push({ id, message, type, duration })
  hapticFeedback(type)
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration)
  }
}

export function removeToast(id: number) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx !== -1) toasts.value.splice(idx, 1)
}

export function useToast() {
  return { toasts, showToast, removeToast }
}

export function formatError(error: unknown, fallback: string): string {
  if (!error) return fallback
  const msg = String(error)
  if (/Failed to fetch|NetworkError|ERR_NAME_NOT_RESOLVED|fetch|ERR_CONNECTION/.test(msg))
    return 'Cannot reach server. Check your internet connection.'
  if (/Unauthorized|auth|Authentication/.test(msg))
    return 'Session expired. Please log in again.'
  if (/not found|does not exist|no such/.test(msg))
    return 'Record not found.'
  if (/timeout|timed out/.test(msg))
    return 'Request timed out. Please try again.'
  if (/abort/.test(msg))
    return 'Operation was cancelled.'
  if (/unique|UNIQUE|already exists/.test(msg))
    return 'A record with this value already exists.'
  return fallback
}

export function hapticFeedback(type: Toast['type']) {
  try {
    if ('vibrate' in navigator) {
      if (type === 'error') navigator.vibrate([100, 50, 100, 50, 200])
      else if (type === 'warning') navigator.vibrate([100, 50, 100])
      else if (type === 'success') navigator.vibrate(80)
      else navigator.vibrate(30)
    }
  } catch {}
}

export interface ConfirmState {
  visible: boolean
  title: string
  message: string
  confirmText: string
  onConfirm: () => void
  onCancel?: () => void
}

const confirmState = ref<ConfirmState>({
  visible: false,
  title: '',
  message: '',
  confirmText: 'OK',
  onConfirm: () => {},
  onCancel: () => {},
})

export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = 'OK',
  onCancel?: () => void
) {
  confirmState.value = {
    visible: true,
    title,
    message,
    confirmText,
    onConfirm,
    onCancel,
  }
}

export function closeConfirm() {
  confirmState.value.visible = false
}

export function useConfirm() {
  return { confirmState, showConfirm, closeConfirm }
}
