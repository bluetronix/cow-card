import { clearSessionCookie, json } from '../_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' })
  clearSessionCookie(req, res)
  return json(res, 200, { success: true })
}
