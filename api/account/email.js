import { getDb } from '../_db.js'
import { classifyError, json, readJson, requestMeta, requireUser } from '../_auth.js'
import { issueToken } from '../_tokens.js'
import { rateLimit } from '../_rateLimit.js'
import { sendVerificationEmail } from '../_email.js'

export default async function handler(req, res) {
  if (req.method !== 'PUT') return json(res, 405, { success: false, error: 'Method not allowed' })

  const userId = await requireUser(req, res)
  if (!userId) return

  try {
    const body = await readJson(req)
    const email = String(body.email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json(res, 400, { success: false, error: 'Enter a valid email address' })
    }

    const meta = requestMeta(req)
    const limit = await rateLimit(`account:email:${userId}`, 3, 60 * 60)
    if (!limit.allowed) {
      return json(res, 429, { success: false, error: 'Too many email change requests. Try again later.' })
    }

    const db = getDb()
    const user = await db.execute({
      sql: 'SELECT email, email_verified_at FROM users WHERE id = ?',
      args: [userId],
    })
    if (user.rows.length === 0) {
      return json(res, 404, { success: false, error: 'Account not found' })
    }

    const currentEmail = String(user.rows[0].email || '')
    const verified = Boolean(user.rows[0].email_verified_at)

    if (email === currentEmail && verified) {
      return json(res, 200, { success: true, message: 'Email is already verified' })
    }

    if (email !== currentEmail) {
      const other = await db.execute({
        sql: 'SELECT 1 FROM users WHERE email = ? AND id <> ?',
        args: [email, userId],
      })
      if (other.rows.length > 0) {
        return json(res, 409, { success: false, error: 'Email already in use' })
      }
    }

    const verification = await issueToken('email_verifications', {
      userId,
      email,
      ttlMinutes: 24 * 60,
      ip: meta.ip,
    })

    try {
      await sendVerificationEmail(email, verification.token)
    } catch (error) {
      console.error('verification email error', error)
      return json(res, 503, {
        success: false,
        error: 'Could not send the verification email. Check email configuration and try again.',
      })
    }

    return json(res, 200, {
      success: true,
      message: 'Verification email sent. Your email changes after verification.',
      pending_email: email,
    })
  } catch (error) {
    console.error('account email error', error)
    const { status, error: message } = classifyError(error)
    return json(res, status, { success: false, error: message })
  }
}
