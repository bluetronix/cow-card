import crypto from 'crypto'
import { getDb } from '../../_db.js'
import {
  buildSession,
  classifyError,
  hashPassword,
  json,
  readJson,
  requestMeta,
  sessionStatement,
  setSessionCookie,
} from '../../_auth.js'
import { issueToken } from '../../_tokens.js'
import { rateLimit } from '../../_rateLimit.js'
import { sendVerificationEmail } from '../../_email.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' })

  try {
    const body = await readJson(req)
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    const fullName = String(body.full_name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const meta = requestMeta(req)

    if (username.length < 3 || username.length > 40) {
      return json(res, 400, { success: false, error: 'Username must be 3-40 characters' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json(res, 400, { success: false, error: 'A valid email address is required' })
    }
    if (password.length < 8) {
      return json(res, 400, { success: false, error: 'Password must be at least 8 characters' })
    }

    const limit = await rateLimit(`register:ip:${meta.ip}`, 10, 60 * 60)
    if (!limit.allowed) {
      return json(res, 429, { success: false, error: 'Too many registration attempts. Try again later.' })
    }

    const db = getDb()
    const id = body.id || crypto.randomUUID()
    const now = new Date().toISOString()
    const session = buildSession(id, req)

    const existingEmail = await db.execute({
      sql: 'SELECT 1 FROM users WHERE email = ?',
      args: [email],
    })
    if (existingEmail.rows.length > 0) {
      return json(res, 409, { success: false, error: 'Email already in use' })
    }

    await db.batch([
      {
        sql: `INSERT INTO users (id, username, full_name, email, email_verified_at, password_hash, created_at)
              VALUES (?, ?, ?, ?, '', ?, ?)`,
        args: [id, username, fullName, email, hashPassword(password), now],
      },
      sessionStatement(session),
    ], 'write')

    setSessionCookie(req, res, session.token)

    try {
      const verification = await issueToken('email_verifications', {
        userId: id,
        email,
        ttlMinutes: 24 * 60,
        ip: meta.ip,
      })
      try {
        await sendVerificationEmail(email, verification.token)
      } catch (emailError) {
        console.error('verification email error', emailError)
        if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'development') {
          const base = process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:5173'
          console.log(`[email:fallback] verification link for ${email}: ${base}/verify-email?token=${verification.token}`)
        }
        // Registration still succeeds; the user can resend from the account page
        // once the email domain is verified or the from address is corrected.
      }
    } catch (error) {
      console.error('verification token error', error)
    }

    return json(res, 200, {
      success: true,
      id,
      username,
      email,
      email_verified: false,
      full_name: fullName,
    })
  } catch (error) {
    console.error('register error', error)
    const raw = String(error?.message || error)
    if (/users\.email/i.test(raw)) {
      return json(res, 409, { success: false, error: 'Email already in use' })
    }
    const { status, error: message } = classifyError(error)
    return json(res, status, { success: false, error: message })
  }
}
