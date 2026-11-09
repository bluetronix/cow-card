import { getDb } from '../../_db.js'
import {
  classifyError,
  clearSessionCookie,
  currentSessionHash,
  json,
  requireUser,
} from '../../_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return json(res, 405, { success: false, error: 'Method not allowed' })

  const userId = await requireUser(req, res)
  if (!userId) return

  try {
    const url = new URL(req.url || '/', 'http://localhost')
    const idHash = req.query?.idHash || decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '')
    if (!idHash) return json(res, 400, { success: false, error: 'Missing session id' })

    const db = getDb()
    const now = new Date().toISOString()
    const result = await db.execute({
      sql: `UPDATE sessions SET revoked_at = ?
            WHERE id_hash = ? AND user_id = ? AND (revoked_at IS NULL OR revoked_at = '')`,
      args: [now, idHash, userId],
    })
    if (!result.rowsAffected) {
      return json(res, 404, { success: false, error: 'Session not found' })
    }

    if (idHash === currentSessionHash(req)) clearSessionCookie(req, res)
    return json(res, 200, { success: true })
  } catch (error) {
    console.error('revoke session error', error)
    const { status, error: message } = classifyError(error)
    return json(res, status, { success: false, error: message })
  }
}
