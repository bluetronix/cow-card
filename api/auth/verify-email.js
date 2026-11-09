import { getDb } from '../_db.js'
import { classifyError, json, readJson } from '../_auth.js'
import { consumeToken } from '../_tokens.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' })

  try {
    const { token } = await readJson(req)
    if (!token) return json(res, 400, { success: false, error: 'Missing verification token' })

    const row = await consumeToken('email_verifications', token)
    if (!row) {
      return json(res, 400, { success: false, error: 'Invalid or expired verification link' })
    }

    const db = getDb()
    const email = String(row.email || '').toLowerCase()
    const other = await db.execute({
      sql: 'SELECT 1 FROM users WHERE email = ? AND id <> ?',
      args: [email, String(row.user_id)],
    })
    if (other.rows.length > 0) {
      return json(res, 409, { success: false, error: 'Email already in use' })
    }

    const now = new Date().toISOString()
    await db.execute({
      sql: 'UPDATE users SET email = ?, email_verified_at = ?, updated_at = ? WHERE id = ?',
      args: [email, now, now, String(row.user_id)],
    })

    return json(res, 200, { success: true, email })
  } catch (error) {
    console.error('verify email error', error)
    const { status, error: message } = classifyError(error)
    return json(res, status, { success: false, error: message })
  }
}
