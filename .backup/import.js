import { createClient } from '@libsql/client'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import Papa from 'papaparse'

const envPath = resolve(import.meta.dirname, '..', '.env')
try {
  const envRaw = readFileSync(envPath, 'utf8')
  for (const line of envRaw.split('\n')) {
    const m = line.match(/^\s*VITE_(\w+)\s*=\s*(.+)/)
    if (m) process.env[`VITE_${m[1]}`] = m[2].replace(/^["']|["']$/g, '').trim()
  }
} catch { /* .env not found */ }

const TURSO_URL = process.env.VITE_TURSO_URL
const TURSO_TOKEN = process.env.VITE_TURSO_AUTH_TOKEN

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('Missing VITE_TURSO_URL or VITE_TURSO_AUTH_TOKEN in .env')
  process.exit(1)
}

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
const backupDir = resolve(import.meta.dirname)

function readCSV(name) {
  const file = resolve(backupDir, `${name}_latest.csv`)
  if (!existsSync(file)) {
    console.error(`  File not found: ${name}_latest.csv`)
    return []
  }
  const raw = readFileSync(file, 'utf8').trim()
  if (!raw) return []
  const parsed = Papa.parse(raw, { header: true, dynamicTyping: true })
  return parsed.data
}

async function importTable(name, columns) {
  const rows = readCSV(name)
  if (rows.length === 0) {
    console.log(`  ${name}: 0 rows, skipping`)
    return 0
  }

  const placeholders = columns.map(() => '?').join(', ')
  const stmt = `INSERT OR REPLACE INTO ${name} (${columns.join(', ')}) VALUES (${placeholders})`
  let count = 0

  for (const row of rows) {
    const args = columns.map(col => row[col] ?? null)
    try {
      await turso.execute({ sql: stmt, args })
      count++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`  Error on row ${count + 1} (${name}): ${msg.slice(0, 80)}`)
    }
  }
  return count
}

console.log(`Importing CSVs from .backup/ to Turso ...`)
console.log()

const cowCols = [
  'id', 'user_id', 'id_no', 'tag', 'collar_no', 'rfid_no', 'name',
  'sex', 'breed', 'colour', 'origin', 'birth_date', 'group_name',
  'dam_id', 'bull_name', 'lactations', 'calving_date', 'pd_date',
  'pd_group', 'pregnancy_result', 'ai_service_date',
  'expected_dry_off_date', 'expected_calving_date', 'days_in_milk',
  'peak_milk_yield', 'current_daily_milk_yield', 'total_lactation_yield',
  'fat_percent', 'protein_percent', 'projected_305d_milk_yield',
  'vaccinations', 'deworming_dates', 'mastitis_history',
  'body_condition_score', 'dead_qtr_teat', 'quarter_teat_status',
  'medical_records', 'feeding_group', 'milking_group', 'pen_barn_no',
  'housing', 'remarks', 'issued_date', 'issued_by', 'image_url',
  'lactation_history', 'current_health_status', 'last_checkup_date',
  'created_at', 'updated_at',
]

const dailyCols = [
  'id', 'cow_id', 'date', 'milk_yield_morning', 'milk_yield_evening',
  'milk_yield_total', 'health_status', 'last_checkup_date', 'temperature',
  'symptoms', 'treatment_given', 'health_notes', 'notes', 'created_at',
]

const c = await importTable('cows', cowCols)
const d = await importTable('daily_records', dailyCols)

console.log()
console.log(`Imported: ${c} cows, ${d} daily records`)
turso.close()
