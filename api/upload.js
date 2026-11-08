import { json, readJson, requireUser } from './_auth.js'
import { imgbbKey } from './_env.js'

const MAX_BASE64_LENGTH = 12 * 1024 * 1024

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const userId = await requireUser(req, res)
  if (!userId) return

  try {
    const { image } = await readJson(req)
    if (!image || typeof image !== 'string') {
      return json(res, 400, { error: 'Missing image data' })
    }
    if (image.length > MAX_BASE64_LENGTH) {
      return json(res, 413, { error: 'Image is too large' })
    }

    const key = imgbbKey()
    if (!key) return json(res, 500, { error: 'Image service is not configured' })

    const base64 = image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
    const body = new URLSearchParams({ key, image: base64 })

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body,
    })
    const data = await response.json()

    if (!data?.success || !data?.data?.url) {
      return json(res, 502, { error: data?.error?.message || 'Image upload failed' })
    }

    return json(res, 200, { url: data.data.url })
  } catch (error) {
    console.error('upload error', error)
    return json(res, 500, { error: 'Image upload failed' })
  }
}
