import { getDb } from '../../_db.js'
import { classifyError, json, requestMeta, requireUser } from '../../_auth.js'
import { issueToken } from '../../_tokens.js'
import { rateLimit } from '../../_rateLimit.js'
import { sendVerificationEmail } from '../../_email.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' })

  const userId = await requireUser(req, res)
  if (!userId) return

  try {
    const meta = requestMeta(req)
    const limit = await rateLimit(`account:verify:${userId}`, 3, 60 * 60)
    if (!limit.allowed) {
      return json(res, 429, { success: false, error: 'Too many verification requests. Try again later.' })
    }

    const db = getDb()
    const user = await db.execute({
      sql: 'SELECT email, email_verified_at FROM users WHERE id = ?',
      args: [userId],
    })
    if (user.rows.length === 0) {
      return json(res, 404, { success: false, error: 'Account not found' })
    }

    const email = String(user.rows[0].email || '')
    if (!email) {
      return json(res, 400, { success: false, error: 'Add an email address first' })
    }
    if (user.rows[0].email_verified_at) {
      return json(res, 400, { success: false, error: 'Email is already verified' })
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

    return json(res, 200, { success: true, message: 'Verification email sent' })
  } catch (error) {
    console.error('resend verification error', error)
    const { status, error: message } = classifyError(error)
    return json(res, status, { success: false, error: message })
  }
}
