import { getDb } from '../_db.js'
import { getQuery, json, requireUser } from '../_auth.js'
import { TABLES } from '../_tables.js'

const TABLE_NAMES = {
  cows: 'cows',
  daily_records: 'daily_records',
  vet_visits: 'vet_visits',
  health_incidents: 'health_incidents',
  treatments: 'treatments',
  lameness_sessions: 'lameness_sessions',
  vaccination_records: 'vaccination_records',
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })

  const userId = requireUser(req, res)
  if (!userId) return

  try {
    const query = getQuery(req)
    const table = String(query.get('table') || '')
    const tableName = TABLE_NAMES[table]
    if (!tableName || !TABLES[table]) return json(res, 400, { error: 'Unknown table' })

    const id = query.get('id')
    const cowId = query.get('cowId')
    const db = getDb()

    let sql
    let args

    if (table === 'cows') {
      sql = 'SELECT * FROM cows WHERE user_id = ?'
      args = [userId]
      if (id) {
        sql += ' AND id = ?'
        args.push(id)
      }
    } else {
      sql = `SELECT t.* FROM ${tableName} t
             JOIN cows c ON c.id = t.cow_id
             WHERE c.user_id = ? AND (c.deleted_at IS NULL OR c.deleted_at = '')`
      args = [userId]
      if (id) {
        sql += ' AND t.id = ?'
        args.push(id)
      }
      if (cowId) {
        sql += ' AND t.cow_id = ?'
        args.push(cowId)
      }
    }

    const result = await db.execute({ sql, args })
    const rows = result.rows.map(row => ({ ...row }))
    return json(res, 200, { rows })
  } catch (error) {
    console.error('sync pull error', error)
    return json(res, 500, { error: 'Sync pull failed' })
  }
}
