export async function compressImageUrl(
  url: string | undefined | null,
  maxDimension: number = 800,
  quality: number = 0.88
): Promise<string> {
  if (!url || typeof url !== 'string') return ''

  return await new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      // Preserve aspect ratio, cap at maxDimension
      const scale = Math.min(maxDimension / img.width, maxDimension / img.height, 1)
      const drawWidth = Math.max(1, img.width * scale)
      const drawHeight = Math.max(1, img.height * scale)
      canvas.width = drawWidth
      canvas.height = drawHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(url)
        return
      }
      // Draw image - canvas re-encoding strips EXIF metadata automatically
      ctx.drawImage(img, 0, 0, drawWidth, drawHeight)
      const compressedUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(compressedUrl)
    }
    img.onerror = () => resolve(url)
    img.src = url
  })
}

export async function compressCowImages(cow: any): Promise<any> {
  const imageFields = [
    'image_url',
    'front_image_url',
    'side_image_url',
    'rear_image_url',
    'head_image_url',
  ] as const

  const compressed: Record<string, any> = { ...cow }

  await Promise.all(
    imageFields.map(async (field) => {
      const val = cow[field]
      if (val && typeof val === 'string' && val.startsWith('http')) {
        compressed[field] = await compressImageUrl(val, 800, 0.88)
      }
    })
  )

  return compressed
}
