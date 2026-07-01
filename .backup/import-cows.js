import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import Papa from 'papaparse'
import crypto from 'crypto'

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

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Usage: node .backup/import-cows.js <path-to-csv>')
  process.exit(1)
}

const USER_ID = '7be4fcea-86a3-4a8a-b132-be895b1966f3'

const MONTHS = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

function parseMonYear(val) {
  if (!val) return ''
  const m = val.trim().match(/^([A-Za-z]{3})-(\d{2})$/)
  if (!m) return val
  const month = MONTHS[m[1]]
  const year = `20${m[2]}`
  return month ? `${year}-${month}-01` : val
}

function parseDateDMY(val) {
  if (!val) return ''
  const m = val.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return val
  const [, d, month, year] = m
  return `${year}-${month.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function parseAge(val) {
  if (!val) return ''
  const age = parseFloat(val)
  if (isNaN(age)) return ''
  const totalMonths = Math.round(age * 12)
  const today = new Date()
  today.setMonth(today.getMonth() - totalMonths)
  return today.toISOString().split('T')[0]
}

function parseNumber(val) {
  if (!val || val.trim() === '--' || val.trim() === '-') return 0
  const n = parseFloat(val.trim())
  return isNaN(n) ? 0 : n
}

function mapGynStatus(gyn, pregStatus) {
  const g = (gyn || '').trim()
  if (g === 'Pregnant') return 'Pregnant'
  if (g === 'Fresh') return ''
  return 'Open'
}

function mapHealthStatus(val) {
  return ''  // health descriptions go to medical_records, not the enum field
}

function parseMedicalRecord(raw) {
  if (!raw) return { deworming: '', vaccinations: '' }
  // Pattern: "Dewormed(4th June 2026, CBPP vaccinated, LSD vaccinated, FMD Vaccinated)"
  const m = raw.trim().match(/^Dewormed\(([^,]+),?\s*(.*)\)$/i)
  if (m) {
    return {
      deworming: `Dewormed(${m[1].trim()})`,
      vaccinations: m[2].trim(),
    }
  }
  return { deworming: '', vaccinations: raw }
}

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
const csvRaw = readFileSync(resolve(csvPath), 'utf8')
const parsed = Papa.parse(csvRaw, { header: false, skipEmptyLines: true, dynamicTyping: false })

const rows = parsed.data
const dataRows = rows.slice(1)

console.log(`Total rows: ${dataRows.length}`)
console.log()

// Delete existing cows for this user so we can re-import cleanly
const del = await turso.execute({
  sql: 'DELETE FROM cows WHERE user_id = ?',
  args: [USER_ID],
})
console.log(`Deleted ${del.rowsAffected} existing records for user`)
console.log()

// Find highest existing id_no for auto-increment
const maxResult = await turso.execute("SELECT MAX(CAST(id_no AS INTEGER)) as max_id FROM cows")
const startFrom = (Number(maxResult.rows[0]?.max_id) || 0) + 1

console.log(`Starting id_no from ${startFrom}`)
console.log()

let imported = 0
let errors = 0

for (const row of dataRows) {
  if (row.length < 17) {
    console.warn(`Skipping short row (${row.length} cols): ${row.join(',')}`)
    errors++
    continue
  }

  const tagVal = (row[0] || '').trim()
  if (!tagVal) {
    console.warn('Skipping row with no tag')
    errors++
    continue
  }

  const collarNo = (row[1] || '').trim()
  const groupName = (row[2] || '').trim()
  const milkingGroup = (row[3] || '').trim()
  const colour = (row[4] || '').trim()
  const breed = (row[5] || '').trim()
  const origin = (row[6] || '').trim()
  const ageVal = (row[7] || '').trim()
  const gynStatus = (row[8] || '').trim()
  const lastPdTest = (row[9] || '').trim()
  const pregStatus = (row[10] || '').trim()
  const expCalving = (row[11] || '').trim()
  const calvingDate = (row[12] || '').trim()
  const dailyYield = (row[13] || '').trim()
  const lactNumber = (row[14] || '').trim()
  const dim = (row[15] || '').trim()
  const deadQuarter = (row[16] || '').trim()
  const healthStatus = (row[17] || '').trim()
  const medicalRecord = (row[18] || '').trim()
  const avgWeight = (row[19] || '').trim()

  const idNo = String(startFrom + imported).padStart(4, '0')
  const birthDate = parseAge(ageVal) || ''
  const pdDate = parseDateDMY(lastPdTest)
  const pregnancyResult = mapGynStatus(gynStatus, pregStatus)
  const expectedCalvingDate = parseMonYear(expCalving)
  const calving = parseMonYear(calvingDate)
  const remarks = avgWeight ? `Avg. weight: ${avgWeight} kg` : ''

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const parsedMed = parseMedicalRecord(medicalRecord)
  const vaccinations = parsedMed.vaccinations
  const dewormingDates = parsedMed.deworming
  const medicalRecords = healthStatus || ''

  try {
    await turso.execute({
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
        current_health_status, last_checkup_date,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, USER_ID, idNo, tagVal, collarNo, '', '', 'Female', breed, colour, origin,
        birthDate, groupName, '', '', parseNumber(lactNumber), calving,
        pdDate, '', pregnancyResult, '',
        '', expectedCalvingDate,
        parseNumber(dim), 0, parseNumber(dailyYield), 0,
        0, 0, 0,
        vaccinations, dewormingDates, '', 0,
        deadQuarter, '', medicalRecords,
        groupName, milkingGroup, '', '', remarks,
        '', '', '', '[]',
        mapHealthStatus(healthStatus), '',
        now, now,
      ],
    })
    imported++
  } catch (e) {
    console.error(`Error importing cow ${tagVal}:`, e)
    errors++
  }
}

console.log(`\nDone. ${imported} imported, ${errors} failed.`)
turso.close()
