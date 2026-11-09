import { getDb } from '../../_db.js'
import { classifyError, hashPassword, json, readJson, requestMeta, revokeAllSessions } from '../../_auth.js'
import { consumeToken } from '../../_tokens.js'
import { rateLimit } from '../../_rateLimit.js'
import { sendPasswordChangedEmail } from '../../_email.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' })

  try {
    const { token, password } = await readJson(req)
    const meta = requestMeta(req)

    const limit = await rateLimit(`reset:ip:${meta.ip}`, 10, 60 * 60)
    if (!limit.allowed) {
      return json(res, 429, { success: false, error: 'Too many attempts. Try again later.' })
    }

    if (!token) return json(res, 400, { success: false, error: 'Missing reset token' })
    if (!password || String(password).length < 8) {
      return json(res, 400, { success: false, error: 'Password must be at least 8 characters' })
    }

    const row = await consumeToken('password_resets', token)
    if (!row) {
      return json(res, 400, { success: false, error: 'Invalid or expired reset link' })
    }

    const db = getDb()
    const user = await db.execute({
      sql: 'SELECT id, email FROM users WHERE id = ?',
      args: [String(row.user_id)],
    })
    if (user.rows.length === 0) {
      return json(res, 400, { success: false, error: 'Invalid or expired reset link' })
    }

    const now = new Date().toISOString()
    await db.execute({
      sql: 'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      args: [hashPassword(password), now, String(row.user_id)],
    })
    await revokeAllSessions(String(row.user_id))

    const email = String(user.rows[0].email || '')
    if (email) {
      await sendPasswordChangedEmail(email).catch(error => {
        console.error('password changed email error', error)
      })
    }

    return json(res, 200, { success: true })
  } catch (error) {
    console.error('reset password error', error)
    const { status, error: message } = classifyError(error)
    return json(res, status, { success: false, error: message })
  }
}
