<script setup lang="ts">
import { ref } from 'vue'
import { useConfirm, closeConfirm } from '../composables/useToast'

const { confirmState } = useConfirm()
const confirming = ref(false)

async function handleConfirm() {
  confirming.value = true
  const cb = confirmState.value.onConfirm
  await cb()
  confirming.value = false
  closeConfirm()
}

function handleCancel() {
  const cb = confirmState.value.onCancel
  closeConfirm()
  cb?.()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="confirmState.visible" class="overlay" @click.self="handleCancel">
        <div class="dialog">
          <h3 class="dialog-title">{{ confirmState.title }}</h3>
          <p class="dialog-message">{{ confirmState.message }}</p>
          <div class="dialog-actions">
            <button v-if="confirmState.onCancel" class="btn-cancel" @click="handleCancel">
              Cancel
            </button>
            <button class="btn-confirm" :disabled="confirming" @click="handleConfirm">
              {{ confirming ? '⏳' : confirmState.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.dialog {
  background: #fff;
  border-radius: 14px;
  padding: 28px 32px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.dialog-title {
  margin: 0 0 12px;
  font-size: 1.15rem;
  color: #1f2937;
}

.dialog-message {
  margin: 0 0 24px;
  font-size: 0.9rem;
  color: #6b7280;
  line-height: 1.5;
}

.dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-confirm {
  padding: 10px 24px;
  background: #1a5276;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  padding: 10px 24px;
  background: #e5e7eb;
  color: #374151;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-confirm:hover { background: #154360; }
.btn-cancel:hover { background: #d1d5db; }

.modal-enter-active { transition: all 0.25s ease-out; }
.modal-leave-active { transition: all 0.2s ease-in; }
.modal-enter-from { opacity: 0; }
.modal-leave-to { opacity: 0; }
.modal-enter-from .dialog { transform: scale(0.92); }
.modal-leave-to .dialog { transform: scale(0.92); }
</style>
