<script setup lang="ts">
import { ref, nextTick } from 'vue'
import Cropper from 'cropperjs'

const props = defineProps<{
  imageSrc: string
  hasExistingImage: boolean
}>()

const emit = defineEmits<{
  crop: [file: File]
  cancel: []
  remove: []
}>()

const mode = ref<'view' | 'crop'>('view')
const fileInput = ref<HTMLInputElement>()
const cropSrc = ref('')
const loading = ref(false)
const imageContainer = ref<HTMLDivElement>()
const imageEl = ref<HTMLImageElement>()
let cropper: Cropper | null = null

function openFilePicker() {
  fileInput.value?.click()
}

function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.[0]) return
  loading.value = true
  const reader = new FileReader()
  reader.onload = e => {
    cropSrc.value = e.target?.result as string
    loading.value = false
    enterCropMode()
  }
  reader.readAsDataURL(input.files[0])
}

function startCrop() {
  cropSrc.value = props.imageSrc
  enterCropMode()
}

function enterCropMode() {
  cropper?.destroy()
  cropper = null
  mode.value = 'crop'
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      nextTick(() => initCropper())
    })
  })
}

async function initCropper() {
  if (!imageEl.value || !imageContainer.value || !cropSrc.value) return
  if (!imageEl.value.complete || imageEl.value.naturalWidth === 0) {
    await new Promise<void>((resolve) => {
      imageEl.value!.onload = () => resolve()
      imageEl.value!.onerror = () => resolve()
      setTimeout(resolve, 8000)
    })
    if (!imageEl.value!.complete || imageEl.value!.naturalWidth === 0) return
  }
  cropper = new Cropper(imageEl.value, {
    aspectRatio: 1 / 1,
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 1,
    cropBoxMovable: false,
    cropBoxResizable: false,
    toggleDragModeOnDblclick: false,
    background: false,
  })
}

function backToView() {
  cropper?.destroy()
  cropper = null
  mode.value = 'view'
}

function confirmCrop() {
  if (!cropper) { emit('cancel'); return }
  const canvas = cropper.getCroppedCanvas({
    width: 400,
    height: 400,
    imageSmoothingQuality: 'high',
  })
  canvas.toBlob(blob => {
    if (!blob) return
    const file = new File([blob], 'cow_photo.jpg', { type: 'image/jpeg' })
    emit('crop', file)
  }, 'image/jpeg', 0.92)
}

function handleCancel() {
  cropper?.destroy()
  cropper = null
  mode.value = 'view'
  emit('cancel')
}

function handleRemove() {
  cropper?.destroy()
  emit('remove')
}
</script>

<template>
  <Teleport to="body">
    <div class="editor-overlay" @click.self="handleCancel">
      <div class="editor-modal">
        <div ref="imageContainer" v-show="mode === 'crop'" class="crop-container">
          <img ref="imageEl" :src="cropSrc" alt="Crop" />
        </div>

        <div v-show="mode === 'view'" class="view-mode">
          <button class="btn-close" @click="handleCancel">✕</button>

          <div class="view-photo">
            <img v-if="imageSrc" :src="imageSrc" alt="Cow photo" />
            <div v-else class="view-placeholder">
              <span class="placeholder-icon">🐄</span>
              <p>No photo yet</p>
            </div>
          </div>

          <div class="view-actions">
            <button class="action-btn primary" @click="openFilePicker">
              {{ hasExistingImage ? 'Replace Photo' : 'Add Photo' }}
            </button>
            <button v-if="hasExistingImage" class="action-btn" @click="startCrop">
              Crop Photo
            </button>
            <button v-if="hasExistingImage" class="action-btn danger" @click="handleRemove">
              Remove Photo
            </button>
          </div>

          <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFileSelected" />
        </div>

        <div v-show="mode === 'crop'" class="crop-controls">
          <div class="crop-header">
            <button class="btn-back" @click="backToView">← Back</button>
            <h3>Crop Photo</h3>
            <div></div>
          </div>

          <div class="crop-footer">
            <button class="btn-cancel" @click="backToView">Cancel</button>
            <button class="btn-confirm" :disabled="loading" @click="confirmCrop">Save</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
@import 'cropperjs/dist/cropper.css';
</style>

<style scoped>
.editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  backdrop-filter: blur(3px);
}

.editor-modal {
  background: #fff;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  position: relative;
}

.view-mode {
  position: relative;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.btn-close {
  position: absolute;
  top: 12px;
  right: 14px;
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #6b7280;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.btn-close:hover { background: #f3f4f6; }

.view-photo {
  width: 200px;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #e5e7eb;
  flex-shrink: 0;
}
.view-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.view-placeholder {
  text-align: center;
  color: #9ca3af;
}
.placeholder-icon { font-size: 2.5rem; display: block; margin-bottom: 4px; }
.view-placeholder p { margin: 0; font-size: 0.85rem; }

.view-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.action-btn {
  padding: 11px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  transition: background 0.15s;
  width: 100%;
  text-align: center;
}
.action-btn:hover { background: #f3f4f6; }
.action-btn.primary {
  background: #1a5276;
  color: #fff;
  border-color: #1a5276;
}
.action-btn.primary:hover { background: #154360; }
.action-btn.danger { color: #dc2626; border-color: #fca5a5; }
.action-btn.danger:hover { background: #fef2f2; }

.crop-container {
  aspect-ratio: 1 / 1;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.crop-container img {
  max-width: 100%;
  max-height: 100%;
  display: block;
}

.crop-controls {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}
.crop-controls > * {
  pointer-events: auto;
}

.crop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(4px);
}
.crop-header h3 { margin: 0; font-size: 1rem; color: #1f2937; }

.btn-back {
  background: none;
  border: none;
  color: #1a5276;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.btn-back:hover { background: #eff6ff; }

.crop-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(4px);
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
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-confirm:hover:not(:disabled) { background: #154360; }

.btn-cancel {
  padding: 10px 24px;
  background: #e5e7eb;
  color: #374151;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn-cancel:hover { background: #d1d5db; }
</style>
