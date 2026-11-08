import crypto from 'crypto'

const COOKIE_NAME = 'cowcard_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

function getSecret() {
  const secret = process.env.SESSION_SECRET || process.env.AUTH_SECRET
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

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function createSession(userId) {
  const expires = Date.now() + SESSION_MAX_AGE * 1000
  const payload = `${userId}.${expires}`
  return `${payload}.${sign(payload)}`
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

export function readSession(req) {
  const cookies = parseCookies(req.headers?.cookie)
  const token = cookies[COOKIE_NAME]
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, expires, signature] = parts
  if (!userId || !expires || Number(expires) < Date.now()) return null

  const payload = `${userId}.${expires}`
  const expected = sign(payload)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  return userId
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

export function requireUser(req, res) {
  try {
    const userId = readSession(req)
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
