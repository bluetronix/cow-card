<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import Cropper from 'cropperjs'

const props = defineProps<{
  imageSrc: string
  filename?: string
  mimeType?: string
}>()

const emit = defineEmits<{
  crop: [file: File]
  cancel: []
}>()

const imageContainer = ref<HTMLDivElement>()
const imageEl = ref<HTMLImageElement>()
let cropper: Cropper | null = null

onMounted(async () => {
  await nextTick()
  if (imageEl.value && imageContainer.value) {
    if (!imageEl.value.complete) {
      await new Promise(resolve => { imageEl.value!.onload = resolve })
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
})

onUnmounted(() => {
  cropper?.destroy()
})

function confirmCrop() {
  if (!cropper) { emit('cancel'); return }
  const canvas = cropper.getCroppedCanvas({
    width: 400,
    height: 400,
    imageSmoothingQuality: 'high',
  })
  canvas.toBlob(blob => {
    if (!blob) return
    const name = props.filename || 'cow_photo.jpg'
    const type = props.mimeType || 'image/jpeg'
    const file = new File([blob], name, { type })
    emit('crop', file)
  }, 'image/jpeg', 0.92)
}

function handleCancel() {
  cropper?.destroy()
  emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div class="cropper-overlay" @click.self="handleCancel">
      <div class="cropper-modal">
        <div class="cropper-header">
          <h3>Crop Photo</h3>
          <p>Position the cow within the square frame</p>
        </div>
        <div ref="imageContainer" class="cropper-container">
          <img ref="imageEl" :src="imageSrc" alt="Crop preview" />
        </div>
        <div class="cropper-actions">
          <button class="btn-cancel" @click="handleCancel">Cancel</button>
          <button class="btn-confirm" @click="confirmCrop">Crop & Save</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
@import 'cropperjs/dist/cropper.css';
</style>

<style scoped>
.cropper-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  backdrop-filter: blur(3px);
}

.cropper-modal {
  background: #fff;
  border-radius: 14px;
  width: 90%;
  max-width: 500px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.cropper-header {
  padding: 20px 24px 0;
}

.cropper-header h3 {
  margin: 0 0 4px;
  font-size: 1.1rem;
  color: #1f2937;
}

.cropper-header p {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
}

.cropper-container {
  margin: 16px;
  max-height: 400px;
  background: #f3f4f6;
}

.cropper-container img {
  max-width: 100%;
  display: block;
}

.cropper-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 24px 20px;
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
</style>
