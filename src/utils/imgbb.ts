const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || ''
const IMGBB_URL = 'https://api.imgbb.com/1/upload'

export async function uploadToImgbb(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('key', IMGBB_API_KEY)
  formData.append('image', file)

  const res = await fetch(IMGBB_URL, {
    method: 'POST',
    body: formData
  })

  const data = await res.json()
  if (data.success) {
    return data.data.url
  }
  throw new Error(data.error?.message || 'ImgBB upload failed')
}
