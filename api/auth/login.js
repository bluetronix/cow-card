import { getDb } from '../_db.js'
import {
  createSession,
  hashPassword,
  isLegacyPasswordHash,
  json,
  readJson,
  setSessionCookie,
  verifyPassword,
} from '../_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { success: false, error: 'Method not allowed' })

  try {
    const { username, password } = await readJson(req)
    if (!username || !password) {
      return json(res, 400, { success: false, error: 'Username and password are required' })
    }

    const db = getDb()
    const result = await db.execute({
      sql: `SELECT id, username, full_name, password_hash
            FROM users
            WHERE username = ? AND (deleted_at IS NULL OR deleted_at = '')`,
      args: [String(username)],
    })

    if (result.rows.length === 0) {
      return json(res, 401, { success: false, error: 'Invalid username or password' })
    }

    const row = result.rows[0]
    if (!verifyPassword(password, row.password_hash)) {
      return json(res, 401, { success: false, error: 'Invalid username or password' })
    }

    if (isLegacyPasswordHash(row.password_hash)) {
      await db.execute({
        sql: 'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
        args: [hashPassword(password), new Date().toISOString(), String(row.id)],
      })
    }

    setSessionCookie(req, res, createSession(String(row.id)))
    return json(res, 200, {
      success: true,
      id: String(row.id),
      username: String(row.username),
      full_name: String(row.full_name || ''),
    })
  } catch (error) {
    console.error('login error', error)
    return json(res, 500, { success: false, error: 'Login failed' })
  }
}
