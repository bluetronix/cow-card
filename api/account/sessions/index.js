import { getDb } from '../../_db.js'
import { classifyError, currentSessionHash, json, requireUser } from '../../_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { success: false, error: 'Method not allowed' })

  const userId = await requireUser(req, res)
  if (!userId) return

  try {
    const db = getDb()
    const now = new Date().toISOString()
    const result = await db.execute({
      sql: `SELECT id_hash, created_at, last_seen_at, expires_at, user_agent, ip
            FROM sessions
            WHERE user_id = ? AND (revoked_at IS NULL OR revoked_at = '') AND expires_at > ?
            ORDER BY created_at DESC
            LIMIT 50`,
      args: [userId, now],
    })

    const current = currentSessionHash(req)
    return json(res, 200, {
      success: true,
      sessions: result.rows.map(row => ({
        id: String(row.id_hash),
        created_at: String(row.created_at || ''),
        last_seen_at: String(row.last_seen_at || ''),
        expires_at: String(row.expires_at || ''),
        user_agent: String(row.user_agent || ''),
        ip: String(row.ip || ''),
        current: String(row.id_hash) === current,
      })),
    })
  } catch (error) {
    console.error('sessions error', error)
    const { status, error: message } = classifyError(error)
    return json(res, status, { success: false, error: message })
  }
}
