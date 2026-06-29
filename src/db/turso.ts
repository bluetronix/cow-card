import { createClient } from '@libsql/client/web'
import type { Cow, DailyRecord } from '../types'

const TURSO_URL = import.meta.env.VITE_TURSO_URL || ''
const TURSO_TOKEN = import.meta.env.VITE_TURSO_AUTH_TOKEN || ''
const turso = TURSO_URL ? createClient({ url: TURSO_URL, authToken: TURSO_TOKEN }) : null

function isConnected(): boolean {
  return turso !== null
}

export async function syncCow(cow: Cow): Promise<boolean> {
  if (!isConnected()) return false
  try {
    await turso!.execute({
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
        cow.sex, cow.breed, cow.colour, cow.origin, cow.birth_date, cow.group_name,
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

export async function syncDailyRecord(record: DailyRecord): Promise<boolean> {
  if (!isConnected()) return false
  try {
    await turso!.execute({
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

export type AuthResult =
  | { success: true; id: string; username: string; full_name: string }
  | { success: false; error: string }

export async function loginUser(username: string, password: string): Promise<AuthResult> {
  if (!isConnected()) {
    return { success: false, error: 'Turso not configured. Set VITE_TURSO_URL and VITE_TURSO_AUTH_TOKEN in .env' }
  }
  try {
    const result = await turso!.execute({
      sql: 'SELECT id, username, full_name FROM users WHERE username = ? AND password_hash = ?',
      args: [username, password]
    })
    if (result.rows.length > 0) {
      const row = result.rows[0] as unknown as { id: string; username: string; full_name: string }
      return { success: true, id: String(row.id), username: String(row.username), full_name: String(row.full_name || '') }
    }
    return { success: false, error: 'Invalid username or password' }
  } catch (e: any) {
    const msg = String(e?.message || e || '')
    console.error('Turso login error:', msg)
    return { success: false, error: formatError(msg) }
  }
}

export async function registerUser(id: string, username: string, password: string, fullName: string = ''): Promise<AuthResult> {
  if (!isConnected()) {
    return { success: false, error: 'Turso not configured. Set VITE_TURSO_URL and VITE_TURSO_AUTH_TOKEN in .env' }
  }
  try {
    await turso!.execute({
      sql: 'INSERT INTO users (id, username, full_name, password_hash) VALUES (?, ?, ?, ?)',
      args: [id, username, fullName, password]
    })
    return { success: true, id, username, full_name: fullName }
  } catch (e: any) {
    const msg = String(e?.message || e || '')
    console.error('Turso register error:', msg)
    if (msg.includes('UNIQUE') || msg.includes('unique') || msg.includes('already exists')) {
      return { success: false, error: 'Username already exists' }
    }
    return { success: false, error: formatError(msg) }
  }
}

function formatError(msg: string): string {
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
    return 'Cannot reach database. Check your Turso URL and connection.'
  }
  if (msg.includes('Unauthorized') || msg.includes('auth')) {
    return 'Turso authentication failed. Check your VITE_TURSO_AUTH_TOKEN.'
  }
  return msg
}

export { isConnected }
