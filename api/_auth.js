import crypto from 'crypto'
import { getDb } from './_db.js'
import { isSessionConfigured, sessionSecret } from './_env.js'

const COOKIE_NAME = 'cowcard_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

function getSecret() {
  const secret = sessionSecret()
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is not configured')
  }
  return 'dev-only-insecure-session-secret'
}

export function json(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

export async function readJson(req) {
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8') || '{}')
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {}
  let raw = ''
  for await (const chunk of req) raw += chunk
  return raw ? JSON.parse(raw) : {}
}

export function getQuery(req) {
  const url = new URL(req.url || '/', 'http://localhost')
  return url.searchParams
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function isLegacyPasswordHash(stored) {
  return Boolean(stored) && !String(stored).startsWith('scrypt$')
}

export function verifyPassword(password, stored) {
  if (!stored) return false
  if (isLegacyPasswordHash(stored)) return String(stored) === String(password)
  const parts = String(stored).split('$')
  if (parts.length !== 3) return false
  const [, salt, expected] = parts
  const actual = crypto.scryptSync(String(password), salt, 64).toString('hex')
  const a = Buffer.from(actual, 'hex')
  const b = Buffer.from(expected, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function hashSessionToken(token) {
  return crypto.createHmac('sha256', getSecret()).update(String(token)).digest('hex')
}

function parseCookies(header) {
  const cookies = {}
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim())
  }
  return cookies
}

function sessionTokenFromRequest(req) {
  return parseCookies(req.headers?.cookie)[COOKIE_NAME] || ''
}

export function buildSession(userId, req) {
  const token = crypto.randomBytes(32).toString('base64url')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE * 1000)
  const userAgent = String(req.headers?.['user-agent'] || '').slice(0, 300)
  const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim()
    .slice(0, 100)

  return {
    token,
    idHash: hashSessionToken(token),
    userId: String(userId),
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    userAgent,
    ip,
  }
}

export function sessionStatement(session) {
  return {
    sql: `INSERT INTO sessions (id_hash, user_id, created_at, last_seen_at, expires_at, revoked_at, user_agent, ip)
          VALUES (?, ?, ?, ?, ?, '', ?, ?)`,
    args: [
      session.idHash,
      session.userId,
      session.createdAt,
      session.lastSeenAt,
      session.expiresAt,
      session.userAgent,
      session.ip,
    ],
  }
}

export async function createSession(userId, req) {
  const session = buildSession(userId, req)
  await getDb().execute(sessionStatement(session))
  return session.token
}

export async function readSession(req) {
  const token = sessionTokenFromRequest(req)
  if (!token) return null

  const idHash = hashSessionToken(token)
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT user_id, expires_at, last_seen_at, revoked_at FROM sessions WHERE id_hash = ?',
    args: [idHash],
  })
  if (result.rows.length === 0) return null

  const row = result.rows[0]
  if (row.revoked_at) return null

  const now = Date.now()
  if (new Date(String(row.expires_at)).getTime() <= now) {
    await db.execute({
      sql: 'UPDATE sessions SET revoked_at = ? WHERE id_hash = ?',
      args: [new Date(now).toISOString(), idHash],
    })
    return null
  }

  const lastSeen = row.last_seen_at ? new Date(String(row.last_seen_at)).getTime() : 0
  if (now - lastSeen > 60 * 60 * 1000) {
    await db.execute({
      sql: 'UPDATE sessions SET last_seen_at = ? WHERE id_hash = ?',
      args: [new Date(now).toISOString(), idHash],
    })
  }

  return String(row.user_id)
}

export async function revokeSession(req) {
  const token = sessionTokenFromRequest(req)
  if (!token) return
  await getDb().execute({
    sql: `UPDATE sessions SET revoked_at = ?
          WHERE id_hash = ? AND (revoked_at IS NULL OR revoked_at = '')`,
    args: [new Date().toISOString(), hashSessionToken(token)],
  })
}

export async function revokeAllSessions(userId) {
  await getDb().execute({
    sql: `UPDATE sessions SET revoked_at = ?
          WHERE user_id = ? AND (revoked_at IS NULL OR revoked_at = '')`,
    args: [new Date().toISOString(), String(userId)],
  })
}

function isSecure(req) {
  return process.env.NODE_ENV === 'production'
    || process.env.VERCEL === '1'
    || req.headers?.['x-forwarded-proto'] === 'https'
}

export function setSessionCookie(req, res, token) {
  const secure = isSecure(req) ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}${secure}`,
  )
}

export function clearSessionCookie(req, res) {
  const secure = isSecure(req) ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`)
}

export function classifyError(error) {
  const message = String(error?.message || error || '')
  const lower = message.toLowerCase()

  if (/unique|already exists/i.test(message)) {
    return { status: 409, error: 'Username already exists' }
  }
  if (/session_secret|auth_secret|session secret/.test(lower)) {
    return { status: 500, error: 'Server auth is not configured. Set SESSION_SECRET in Vercel.' }
  }
  if (/database is not configured|turso_url|turso_auth_token/.test(lower)) {
    return { status: 500, error: 'Server database is not configured. Set TURSO_URL and TURSO_AUTH_TOKEN in Vercel.' }
  }
  if (/no such table|no such column|schema_migrations/.test(lower)) {
    return { status: 500, error: 'Database schema is missing or not migrated. Run npm run db:migrate against the production database.' }
  }
  if (/unauthorized|401|invalid token|auth token|jwt/.test(lower)) {
    return { status: 500, error: 'Database authentication failed. Check TURSO_AUTH_TOKEN.' }
  }
  if (/enotfound|econnrefused|failed to fetch|fetch failed|network|timeout/.test(lower)) {
    return { status: 503, error: 'Cannot reach the database. Check TURSO_URL and network access.' }
  }
  return { status: 500, error: 'Server error' }
}

export { isSessionConfigured }

export async function requireUser(req, res) {
  try {
    const userId = await readSession(req)
    if (!userId) {
      json(res, 401, { error: 'Unauthorized' })
      return null
    }
    return userId
  } catch (error) {
    console.error('session error', error)
    const { status, error: message } = classifyError(error)
    json(res, status, { error: message })
    return null
  }
}
