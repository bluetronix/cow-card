import { getDb } from '../../_db.js'
import {
  buildSession,
  classifyError,
  hashPassword,
  json,
  persistSession,
  readJson,
  requireUser,
  revokeOtherSessions,
  setSessionCookie,
  verifyPassword,
} from '../../_auth.js'
import { rateLimit } from '../../_rateLimit.js'
import { sendPasswordChangedEmail } from '../../_email.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' })

  try {
    const { current_password, new_password } = await readJson(req)
    const userId = await requireUser(req, res)
    if (!userId) return

    const limit = await rateLimit(`account:password:${userId}`, 10, 60 * 60)
    if (!limit.allowed) {
      return json(res, 429, { success: false, error: 'Too many password changes. Try again later.' })
    }

    if (!current_password || !new_password) {
      return json(res, 400, { success: false, error: 'Current and new password are required' })
    }
    if (String(new_password).length < 8) {
      return json(res, 400, { success: false, error: 'New password must be at least 8 characters' })
    }

    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT email, password_hash FROM users WHERE id = ?',
      args: [userId],
    })
    if (result.rows.length === 0) {
      return json(res, 404, { success: false, error: 'Account not found' })
    }

    const row = result.rows[0]
    if (!verifyPassword(current_password, row.password_hash)) {
      return json(res, 400, { success: false, error: 'Current password is incorrect' })
    }

    const now = new Date().toISOString()
    await db.execute({
      sql: 'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      args: [hashPassword(new_password), now, userId],
    })

    const session = buildSession(userId, req)
    await persistSession(session)
    await revokeOtherSessions(userId, session.idHash)
    setSessionCookie(req, res, session.token)

    const email = String(row.email || '')
    if (email) {
      await sendPasswordChangedEmail(email).catch(error => {
        console.error('password changed email error', error)
      })
    }

    return json(res, 200, { success: true })
  } catch (error) {
    console.error('change password error', error)
    const { status, error: message } = classifyError(error)
    return json(res, status, { success: false, error: message })
  }
}
