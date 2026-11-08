import { classifyError, clearSessionCookie, json, requireUser, revokeAllSessions } from '../_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' })

  const userId = await requireUser(req, res)
  if (!userId) return

  try {
    await revokeAllSessions(userId)
    clearSessionCookie(req, res)
    return json(res, 200, { success: true })
  } catch (error) {
    console.error('logout-all error', error)
    const { status, error: message } = classifyError(error)
    return json(res, status, { success: false, error: message })
  }
}
