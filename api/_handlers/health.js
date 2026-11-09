import { getDb } from '../_db.js'
import { appUrl, dbEnv, isDbConfigured, isEmailConfigured, isSessionConfigured } from '../_env.js'
import { classifyError, json } from '../_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })

  const env = dbEnv()
  const sessionConfigured = isSessionConfigured()
  let reachable = false
  let schemaReady = false
  let sessionsReady = false
  let accountTablesReady = false
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

      const sessions = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sessions'")
      sessionsReady = sessions.rows.length > 0

      const accountTables = await db.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('email_verifications','password_resets','auth_rate_limits')"
      )
      accountTablesReady = accountTables.rows.length === 3

      const migrations = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
      migrationsReady = migrations.rows.length > 0
    } catch (e) {
      error = classifyError(e).error
    }
  }

  const ok = isDbConfigured() && reachable && schemaReady && sessionsReady && accountTablesReady && sessionConfigured
  return json(res, ok ? 200 : 503, {
    ok,
    database: {
      configured: Boolean(env.url),
      reachable,
      schemaReady,
      sessionsReady,
      accountTablesReady,
      migrationsReady,
    },
    auth: {
      sessionConfigured,
    },
    email: {
      configured: isEmailConfigured(),
      appUrlConfigured: Boolean(appUrl()),
    },
    error,
    timestamp: new Date().toISOString(),
  })
}
