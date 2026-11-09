import { getDb } from '../_db.js'
import { classifyError, json, readJson, requestMeta } from '../_auth.js'
import { issueToken } from '../_tokens.js'
import { rateLimit } from '../_rateLimit.js'
import { sendPasswordResetEmail } from '../_email.js'

const GENERIC = 'If an account exists, a reset link was sent.'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' })

  try {
    const { email: rawEmail } = await readJson(req)
    const email = String(rawEmail || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json(res, 400, { success: false, error: 'Enter a valid email address' })
    }

    const meta = requestMeta(req)
    const ipLimit = await rateLimit(`forgot:ip:${meta.ip}`, 10, 60 * 60)
    const emailLimit = await rateLimit(`forgot:email:${email}`, 3, 60 * 60)
    if (!ipLimit.allowed || !emailLimit.allowed) {
      return json(res, 429, { success: false, error: 'Too many requests. Try again later.' })
    }

    const db = getDb()
    const result = await db.execute({
      sql: `SELECT id, email FROM users
            WHERE email = ? AND email_verified_at <> '' AND (deleted_at IS NULL OR deleted_at = '')`,
      args: [email],
    })

    if (result.rows.length > 0) {
      const user = result.rows[0]
      try {
        const reset = await issueToken('password_resets', {
          userId: user.id,
          ttlMinutes: 20,
          ip: meta.ip,
        })
        await sendPasswordResetEmail(String(user.email), reset.token).catch(error => {
          console.error('password reset email error', error)
        })
      } catch (error) {
        console.error('password reset token error', error)
      }
    }

    return json(res, 200, { success: true, message: GENERIC })
  } catch (error) {
    console.error('forgot password error', error)
    const { status, error: message } = classifyError(error)
    return json(res, status, { success: false, error: message })
  }
}
