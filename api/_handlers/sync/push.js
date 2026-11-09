import { getDb } from '../../_db.js'
import { json, readJson, requireUser } from '../../_auth.js'
import { TABLES } from '../../_tables.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const userId = await requireUser(req, res)
  if (!userId) return

  try {
    const body = await readJson(req)
    const table = String(body.table || '')
    const record = body.record

    const columns = TABLES[table]
    if (!columns) return json(res, 400, { error: 'Unknown table' })
    if (!record || !record.id) return json(res, 400, { error: 'Missing record id' })

    const db = getDb()
    const now = new Date().toISOString()
    const payload = { ...record, updated_at: record.updated_at || now }

    if (table === 'cows') {
      const existing = await db.execute({
        sql: 'SELECT user_id FROM cows WHERE id = ?',
        args: [String(record.id)],
      })
      if (existing.rows.length > 0 && String(existing.rows[0].user_id) !== userId) {
        return json(res, 403, { error: 'Record does not belong to this user' })
      }
      payload.user_id = userId
    } else {
      const cowId = String(payload.cow_id || '')
      if (!cowId) return json(res, 400, { error: 'Missing cow_id' })
      const owned = await db.execute({
        sql: 'SELECT 1 FROM cows WHERE id = ? AND user_id = ?',
        args: [cowId, userId],
      })
      if (owned.rows.length === 0) return json(res, 403, { error: 'Cow does not belong to this user' })

      const existing = await db.execute({
        sql: `SELECT c.user_id FROM ${table} t
              JOIN cows c ON c.id = t.cow_id
              WHERE t.id = ?`,
        args: [String(record.id)],
      })
      if (existing.rows.length > 0 && String(existing.rows[0].user_id) !== userId) {
        return json(res, 403, { error: 'Record does not belong to this user' })
      }
    }

    const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')})
                 VALUES (${columns.map(() => '?').join(', ')})`
    const args = columns.map(column => payload[column] ?? null)
    await db.execute({ sql, args })

    return json(res, 200, { ok: true, id: String(record.id), updated_at: payload.updated_at })
  } catch (error) {
    console.error('sync push error', error)
    return json(res, 500, { error: 'Sync push failed' })
  }
}
