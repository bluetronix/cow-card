import { clearSessionCookie, json, revokeSession } from '../../_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' })
  try {
    await revokeSession(req)
  } catch (error) {
    console.error('logout revoke error', error)
  }
  clearSessionCookie(req, res)
  return json(res, 200, { success: true })
}
