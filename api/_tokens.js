import crypto from 'crypto'
import { getDb } from './_db.js'
import { sessionSecret } from './_env.js'

const ALLOWED = new Set(['email_verifications', 'password_resets'])

function getSecret() {
  const secret = sessionSecret()
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is not configured')
  }
  return 'dev-only-insecure-session-secret'
}

function tableName(table) {
  if (!ALLOWED.has(table)) throw new Error('Unknown token table')
  return table
}

function hashToken(token) {
  return crypto.createHmac('sha256', getSecret()).update(String(token)).digest('hex')
}

export function randomToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export async function issueToken(table, { userId, email = '', ttlMinutes, ip = '' }) {
  const name = tableName(table)
  const token = randomToken()
  const idHash = hashToken(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000)
  const nowIso = now.toISOString()
  const db = getDb()

  await db.execute({
    sql: `UPDATE ${name} SET used_at = ?
          WHERE user_id = ? AND (used_at IS NULL OR used_at = '')`,
    args: [nowIso, String(userId)],
  })

  if (name === 'email_verifications') {
    await db.execute({
      sql: `INSERT INTO email_verifications
              (id_hash, user_id, email, created_at, expires_at, used_at, requested_ip)
            VALUES (?, ?, ?, ?, ?, '', ?)`,
      args: [idHash, String(userId), String(email), nowIso, expiresAt.toISOString(), ip],
    })
  } else {
    await db.execute({
      sql: `INSERT INTO password_resets
              (id_hash, user_id, created_at, expires_at, used_at, requested_ip)
            VALUES (?, ?, ?, ?, '', ?)`,
      args: [idHash, String(userId), nowIso, expiresAt.toISOString(), ip],
    })
  }

  return { token, expiresAt: expiresAt.toISOString() }
}

export async function consumeToken(table, token) {
  const name = tableName(table)
  if (!token) return null
  const idHash = hashToken(token)
  const nowIso = new Date().toISOString()
  const db = getDb()

  const update = await db.execute({
    sql: `UPDATE ${name} SET used_at = ?
          WHERE id_hash = ? AND (used_at IS NULL OR used_at = '') AND expires_at > ?`,
    args: [nowIso, idHash, nowIso],
  })
  if (!update.rowsAffected) return null

  const result = await db.execute({
    sql: `SELECT * FROM ${name} WHERE id_hash = ?`,
    args: [idHash],
  })
  return result.rows[0] || null
}
