import { apiFetch } from '../db/api'

async function compressForUpload(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const maxDimension = 1600
    const scale = Math.min(maxDimension / bitmap.width, maxDimension / bitmap.height, 1)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return await new Promise<Blob>(resolve => {
      canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', 0.85)
    })
  } catch {
    return file
  }
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Failed to read image'))
    reader.readAsDataURL(file)
  })
}

export async function uploadToImgbb(file: File): Promise<string> {
  const compressed = await compressForUpload(file)
  const image = await fileToDataUrl(compressed)
  const data = await apiFetch<{ url?: string }>('/upload', {
    method: 'POST',
    body: JSON.stringify({ image }),
  })
  if (!data?.url) throw new Error('Image upload failed')
  return data.url
}
