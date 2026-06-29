import { createClient } from '@libsql/client'
import type { Cow, DailyRecord } from '../types'

const turso = createClient({
  url: import.meta.env.VITE_TURSO_URL || '',
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN || '',
})

export async function syncCow(cow: Cow) {
  try {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO cows (
        id, user_id, id_no, tag, collar_no, name, sex, breed, colour, origin,
        birth_date, group_name, dam_id, bull_name, lactations, calving_date,
        pd_date, pregnancy_result, expected_dry_off_date, expected_calving_date,
        days_in_milk, peak_milk_yield, current_daily_milk_yield, total_lactation_yield,
        vaccinations, deworming_dates, mastitis_history, body_condition_score,
        dead_qtr_teat, medical_records, issued_date, issued_by, image_url,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        cow.id, cow.user_id, cow.id_no, cow.tag, cow.collar_no, cow.name,
        cow.breed, cow.sex, cow.colour, cow.origin, cow.birth_date, cow.group_name,
        cow.dam_id, cow.bull_name, cow.lactations, cow.calving_date,
        cow.pd_date, cow.pregnancy_result, cow.expected_dry_off_date, cow.expected_calving_date,
        cow.days_in_milk, cow.peak_milk_yield, cow.current_daily_milk_yield, cow.total_lactation_yield,
        cow.vaccinations, cow.deworming_dates, cow.mastitis_history, cow.body_condition_score,
        cow.dead_qtr_teat, cow.medical_records, cow.issued_date, cow.issued_by, cow.image_url,
        cow.created_at, cow.updated_at
      ]
    })
    return true
  } catch (e) {
    console.error('Turso sync error (cow):', e)
    return false
  }
}

export async function syncDailyRecord(record: DailyRecord) {
  try {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO daily_records (
        id, cow_id, date, milk_yield, body_condition_score, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [record.id, record.cow_id, record.date, record.milk_yield, record.body_condition_score, record.notes, record.created_at]
    })
    return true
  } catch (e) {
    console.error('Turso sync error (daily):', e)
    return false
  }
}

export async function loginUser(username: string, password: string): Promise<{ id: string; username: string; full_name: string } | null> {
  try {
    const result = await turso.execute({
      sql: 'SELECT id, username, full_name FROM users WHERE username = ? AND password_hash = ?',
      args: [username, password]
    })
    if (result.rows.length > 0) {
      const row = result.rows[0] as unknown as { id: string; username: string; full_name: string }
      return { id: row.id, username: row.username, full_name: row.full_name || '' }
    }
    return null
  } catch {
    return null
  }
}

export async function registerUser(id: string, username: string, password: string, fullName: string = ''): Promise<boolean> {
  try {
    await turso.execute({
      sql: 'INSERT INTO users (id, username, full_name, password_hash) VALUES (?, ?, ?, ?)',
      args: [id, username, fullName, password]
    })
    return true
  } catch {
    return false
  }
}
