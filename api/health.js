import { dbEnv, getDb, isDbConfigured } from './_db.js'
import { classifyError, json } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })

  const env = dbEnv()
  const sessionConfigured = Boolean(process.env.SESSION_SECRET || process.env.AUTH_SECRET)
  let reachable = false
  let schemaReady = false
  let migrationsReady = false
  let error = null

  if (!isDbConfigured()) {
    error = 'Server database is not configured. Set TURSO_URL and TURSO_AUTH_TOKEN in Vercel.'
  } else {
    try {
      const db = getDb()
      await db.execute('SELECT 1')
      reachable = true

      const users = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
      schemaReady = users.rows.length > 0

      const migrations = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
      migrationsReady = migrations.rows.length > 0
    } catch (e) {
      error = classifyError(e).error
    }
  }

  const ok = isDbConfigured() && reachable && schemaReady && sessionConfigured
  return json(res, ok ? 200 : 503, {
    ok,
    database: {
      configured: Boolean(env.url),
      reachable,
      schemaReady,
      migrationsReady,
    },
    auth: {
      sessionConfigured,
    },
    error,
    timestamp: new Date().toISOString(),
  })
}
