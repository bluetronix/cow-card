import { createClient } from '@libsql/client/web'
import type { Cow } from '../types'

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
        id, user_id, id_no, tag, collar_no, rfid_no, name, sex, breed, colour, origin,
        birth_date, group_name, dam_id, bull_name, lactations, calving_date,
        pd_date, pd_group, pregnancy_result, ai_service_date,
        expected_dry_off_date, expected_calving_date,
        days_in_milk, peak_milk_yield, current_daily_milk_yield, total_lactation_yield,
        fat_percent, protein_percent, projected_305d_milk_yield,
        vaccinations, deworming_dates, mastitis_history, body_condition_score,
        dead_qtr_teat, quarter_teat_status, medical_records,
        feeding_group, milking_group, pen_barn_no, housing, remarks,
        issued_date, issued_by, image_url, lactation_history,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        cow.id, cow.user_id, cow.id_no, cow.tag, cow.collar_no, cow.rfid_no, cow.name,
        cow.sex, cow.breed, cow.colour, cow.origin, cow.birth_date, cow.group_name,
        cow.dam_id, cow.bull_name, cow.lactations, cow.calving_date,
        cow.pd_date, cow.pd_group, cow.pregnancy_result, cow.ai_service_date,
        cow.expected_dry_off_date, cow.expected_calving_date,
        cow.days_in_milk, cow.peak_milk_yield, cow.current_daily_milk_yield, cow.total_lactation_yield,
        cow.fat_percent, cow.protein_percent, cow.projected_305d_milk_yield,
        cow.vaccinations, cow.deworming_dates, cow.mastitis_history, cow.body_condition_score,
        cow.dead_qtr_teat, cow.quarter_teat_status, cow.medical_records,
        cow.feeding_group, cow.milking_group, cow.pen_barn_no, cow.housing, cow.remarks,
        cow.issued_date, cow.issued_by, cow.image_url, cow.lactation_history,
        cow.created_at, cow.updated_at
      ]
    })
    return true
  } catch (e) {
    console.error('Turso sync error (cow):', e)
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

export async function fetchCows(): Promise<Cow[]> {
  if (!isConnected()) return []
  try {
    const result = await turso!.execute({
      sql: 'SELECT * FROM cows',
    })
    console.log('[fetchCows] rows returned:', result.rows.length)
    if (result.rows.length > 0) {
      console.log('[fetchCows] sample columns:', Object.keys(result.rows[0] as any))
    }
    return result.rows.map(row => {
      const r = row as any
      return {
        id: String(r.id || ''),
        user_id: String(r.user_id || ''),
        id_no: String(r.id_no || ''),
        tag: String(r.tag || ''),
        collar_no: String(r.collar_no || ''),
        rfid_no: String(r.rfid_no || ''),
        name: String(r.name || ''),
        sex: (String(r.sex || '') as 'Male' | 'Female' | ''),
        breed: String(r.breed || ''),
        colour: String(r.colour || ''),
        origin: String(r.origin || ''),
        birth_date: String(r.birth_date || ''),
        group_name: String(r.group_name || ''),
        dam_id: String(r.dam_id || ''),
        bull_name: String(r.bull_name || ''),
        lactations: Number(r.lactations ?? 0),
        calving_date: String(r.calving_date || ''),
        pd_date: String(r.pd_date || ''),
        pd_group: String(r.pd_group || ''),
        pregnancy_result: (String(r.pregnancy_result || '') as 'Pregnant' | 'Open' | ''),
        ai_service_date: String(r.ai_service_date || ''),
        expected_dry_off_date: String(r.expected_dry_off_date || ''),
        expected_calving_date: String(r.expected_calving_date || ''),
        days_in_milk: Number(r.days_in_milk ?? 0),
        peak_milk_yield: Number(r.peak_milk_yield ?? 0),
        current_daily_milk_yield: Number(r.current_daily_milk_yield ?? 0),
        total_lactation_yield: Number(r.total_lactation_yield ?? 0),
        fat_percent: Number(r.fat_percent ?? 0),
        protein_percent: Number(r.protein_percent ?? 0),
        projected_305d_milk_yield: Number(r.projected_305d_milk_yield ?? 0),
        vaccinations: String(r.vaccinations || ''),
        deworming_dates: String(r.deworming_dates || ''),
        mastitis_history: String(r.mastitis_history || ''),
        body_condition_score: Number(r.body_condition_score ?? 0),
        dead_qtr_teat: String(r.dead_qtr_teat || ''),
        quarter_teat_status: String(r.quarter_teat_status || ''),
        medical_records: String(r.medical_records || ''),
        feeding_group: String(r.feeding_group || ''),
        milking_group: String(r.milking_group || ''),
        pen_barn_no: String(r.pen_barn_no || ''),
        housing: String(r.housing || ''),
        remarks: String(r.remarks || ''),
        issued_date: String(r.issued_date || ''),
        issued_by: String(r.issued_by || ''),
        image_url: String(r.image_url || ''),
        lactation_history: String(r.lactation_history || ''),
        created_at: String(r.created_at || ''),
        updated_at: String(r.updated_at || ''),
        synced: 1,
      } as Cow
    })
  } catch (e: any) {
    console.error('[fetchCows] error:', e?.message || e)
    return []
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

export async function fetchCowById(id: string): Promise<Cow | null> {
  if (!isConnected()) return null
  try {
    const result = await turso!.execute({
      sql: 'SELECT * FROM cows WHERE id = ?',
      args: [id]
    })
    if (result.rows.length === 0) return null
    const r = result.rows[0] as any
    return {
      id: String(r.id || ''),
      user_id: String(r.user_id || ''),
      id_no: String(r.id_no || ''),
      tag: String(r.tag || ''),
      collar_no: String(r.collar_no || ''),
      rfid_no: String(r.rfid_no || ''),
      name: String(r.name || ''),
      sex: (String(r.sex || '') as 'Male' | 'Female' | ''),
      breed: String(r.breed || ''),
      colour: String(r.colour || ''),
      origin: String(r.origin || ''),
      birth_date: String(r.birth_date || ''),
      group_name: String(r.group_name || ''),
      dam_id: String(r.dam_id || ''),
      bull_name: String(r.bull_name || ''),
      lactations: Number(r.lactations ?? 0),
      calving_date: String(r.calving_date || ''),
      pd_date: String(r.pd_date || ''),
      pd_group: String(r.pd_group || ''),
      pregnancy_result: (String(r.pregnancy_result || '') as 'Pregnant' | 'Open' | ''),
      ai_service_date: String(r.ai_service_date || ''),
      expected_dry_off_date: String(r.expected_dry_off_date || ''),
      expected_calving_date: String(r.expected_calving_date || ''),
      days_in_milk: Number(r.days_in_milk ?? 0),
      peak_milk_yield: Number(r.peak_milk_yield ?? 0),
      current_daily_milk_yield: Number(r.current_daily_milk_yield ?? 0),
      total_lactation_yield: Number(r.total_lactation_yield ?? 0),
      fat_percent: Number(r.fat_percent ?? 0),
      protein_percent: Number(r.protein_percent ?? 0),
      projected_305d_milk_yield: Number(r.projected_305d_milk_yield ?? 0),
      vaccinations: String(r.vaccinations || ''),
      deworming_dates: String(r.deworming_dates || ''),
      mastitis_history: String(r.mastitis_history || ''),
      body_condition_score: Number(r.body_condition_score ?? 0),
      dead_qtr_teat: String(r.dead_qtr_teat || ''),
      quarter_teat_status: String(r.quarter_teat_status || ''),
      medical_records: String(r.medical_records || ''),
      feeding_group: String(r.feeding_group || ''),
      milking_group: String(r.milking_group || ''),
      pen_barn_no: String(r.pen_barn_no || ''),
      housing: String(r.housing || ''),
      remarks: String(r.remarks || ''),
      issued_date: String(r.issued_date || ''),
      issued_by: String(r.issued_by || ''),
      image_url: String(r.image_url || ''),
      lactation_history: String(r.lactation_history || ''),
      created_at: String(r.created_at || ''),
      updated_at: String(r.updated_at || ''),
      synced: 1,
    } as Cow
  } catch (e: any) {
    console.error('[fetchCowById] error:', e?.message || e)
    return null
  }
}

export { isConnected }
