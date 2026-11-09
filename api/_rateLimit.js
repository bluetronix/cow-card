import { getDb } from './_db.js'

export async function rateLimit(key, limit, windowSeconds) {
  const db = getDb()
  const windowMs = windowSeconds * 1000
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString()

  await db.execute({
    sql: `INSERT INTO auth_rate_limits (key, window_start, count)
          VALUES (?, ?, 1)
          ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1`,
    args: [key, windowStart],
  })

  const result = await db.execute({
    sql: 'SELECT count FROM auth_rate_limits WHERE key = ? AND window_start = ?',
    args: [key, windowStart],
  })
  const count = Number(result.rows[0]?.count || 0)
  return { allowed: count <= limit, count }
}
