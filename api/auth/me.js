import { getDb } from '../_db.js'
import { classifyError, json, requireUser } from '../_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { success: false, error: 'Method not allowed' })

  const userId = await requireUser(req, res)
  if (!userId) return

  try {
    const db = getDb()
    const result = await db.execute({
      sql: `SELECT id, username, full_name
            FROM users
            WHERE id = ?`,
      args: [userId],
    })
    if (result.rows.length === 0) return json(res, 401, { success: false, error: 'Unauthorized' })

    const row = result.rows[0]
    return json(res, 200, {
      success: true,
      user: {
        id: String(row.id),
        username: String(row.username),
        full_name: String(row.full_name || ''),
      },
    })
  } catch (error) {
    console.error('me error', error)
    const { status, error: message } = classifyError(error)
    return json(res, status, { success: false, error: message })
  }
}
