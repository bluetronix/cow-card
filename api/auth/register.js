import crypto from 'crypto'
import { getDb } from '../_db.js'
import {
  buildSession,
  classifyError,
  hashPassword,
  json,
  readJson,
  sessionStatement,
  setSessionCookie,
} from '../_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' })

  try {
    const body = await readJson(req)
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    const fullName = String(body.full_name || '').trim()

    if (username.length < 3 || username.length > 40) {
      return json(res, 400, { success: false, error: 'Username must be 3-40 characters' })
    }
    if (password.length < 6) {
      return json(res, 400, { success: false, error: 'Password must be at least 6 characters' })
    }

    const db = getDb()
    const id = body.id || crypto.randomUUID()
    const now = new Date().toISOString()
    const session = buildSession(id, req)

    await db.batch([
      {
        sql: `INSERT INTO users (id, username, full_name, password_hash, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [id, username, fullName, hashPassword(password), now],
      },
      sessionStatement(session),
    ], 'write')

    setSessionCookie(req, res, session.token)
    return json(res, 200, {
      success: true,
      id,
      username,
      full_name: fullName,
    })
  } catch (error) {
    console.error('register error', error)
    const { status, error: message } = classifyError(error)
    return json(res, status, { success: false, error: message })
  }
}
