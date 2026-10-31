import { getDb } from '../../_db.js'
import { json } from '../../_auth.js'
import { PUBLIC_COW_COLUMNS } from '../../_tables.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })

  try {
    const url = new URL(req.url || '/', 'http://localhost')
    const id = req.query?.id || decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '')
    if (!id) return json(res, 400, { error: 'Missing cow id' })

    const db = getDb()
    const result = await db.execute({
      sql: `SELECT ${PUBLIC_COW_COLUMNS.join(', ')}
            FROM cows
            WHERE id = ? AND (deleted_at IS NULL OR deleted_at = '')`,
      args: [id],
    })

    if (result.rows.length === 0) return json(res, 404, { error: 'Cow not found' })
    return json(res, 200, { cow: { ...result.rows[0] } })
  } catch (error) {
    console.error('public cow error', error)
    return json(res, 500, { error: 'Failed to load cow' })
  }
}
