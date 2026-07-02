<script setup lang="ts">
import { useToast } from '../composables/useToast'

const { toasts, removeToast } = useToast()

const icons: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="t.type"
          @click="removeToast(t.id)"
        >
          <span class="toast-icon">{{ icons[t.type] || 'ℹ' }}</span>
          <span class="toast-message">{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  max-width: 400px;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1.4;
  backdrop-filter: blur(6px);
}

.toast-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.toast.success {
  background: #065f46;
  color: #d1fae5;
  border-left: 4px solid #34d399;
}

.toast.error {
  background: #7f1d1d;
  color: #fee2e2;
  border-left: 4px solid #ef4444;
}

.toast.warning {
  background: #78350f;
  color: #fef3c7;
  border-left: 4px solid #f59e0b;
}

.toast.info {
  background: #1e3a5f;
  color: #dbeafe;
  border-left: 4px solid #3b82f6;
}

.toast-enter-active {
  transition: all 0.35s cubic-bezier(0.21, 1.02, 0.73, 1);
}

.toast-leave-active {
  transition: all 0.25s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(60px) scale(0.92);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(80px) scale(0.92);
}

@media (max-width: 640px) {
  .toast-container {
    top: 8px;
    right: 8px;
    left: 8px;
    max-width: none;
  }
}
</style>
