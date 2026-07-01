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
} catch {}

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
  if (!m) {
    // try day-mon format: "1-Aug" or "25-Nov"
    const dm = val.trim().match(/^(\d{1,2})-([A-Za-z]{3})$/)
    if (dm) {
      const month = MONTHS[dm[2]]
      return month ? `2026-${month}-${dm[1].padStart(2, '0')}` : val
    }
    return val
  }
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
  if (!val || val.trim() === '--' || val.trim() === '-') return undefined
  const n = parseFloat(val.trim())
  return isNaN(n) ? undefined : n
}

function mapGynStatus(gyn) {
  const g = (gyn || '').trim()
  if (g === 'Pregnant') return 'Pregnant'
  if (g === 'Fresh') return ''
  return 'Open'
}

// CSV column definitions: [index, dbField, parser, isNumber]
const CSV_COLS = [
  [0, 'tag',                v => v.trim(), false],
  [2, 'group_name',         v => v.trim(), false],
  [2, 'feeding_group',      v => v.trim(), false],  // same as group_name
  [3, 'milking_group',      v => v.trim(), false],
  [4, 'colour',             v => v.trim(), false],
  [5, 'breed',              v => v.trim(), false],
  [6, 'origin',             v => v.trim(), false],
  [7, 'birth_date',         v => parseAge(v), false],
  [8, 'pregnancy_result',   v => mapGynStatus(v), false],
  [9, 'pd_date',            v => parseDateDMY(v.trim()), false],
  [11, 'expected_calving_date', v => parseMonYear(v.trim()), false],
  [12, 'calving_date',      v => parseMonYear(v.trim()), false],
  [13, 'current_daily_milk_yield', v => parseNumber(v), true],
  [14, 'lactations',        v => parseNumber(v), true],
  [15, 'days_in_milk',      v => parseNumber(v), true],
]

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
const csvRaw = readFileSync(resolve(csvPath), 'utf8')
const parsed = Papa.parse(csvRaw, { header: false, skipEmptyLines: true })
const dataRows = parsed.data.slice(1)

console.log(`Total rows: ${dataRows.length}`)
console.log()

let inserted = 0
let updated = 0
let skipped = 0
let errors = 0

for (const row of dataRows) {
  if (row.length < 16) {
    skipped++
    continue
  }

  const collarNo = (row[1] || '').trim()
  if (!collarNo) {
    skipped++
    continue
  }

  const tagVal = (row[0] || '').trim()
  if (!tagVal) {
    skipped++
    continue
  }

  // Check if cow exists by collar_no
  const existing = await turso.execute({
    sql: 'SELECT id, id_no FROM cows WHERE collar_no = ?',
    args: [collarNo],
  })

  if (existing.rows.length > 0) {
    // --- UPDATE existing cow ---
    const setClauses = []
    const setArgs = []

    for (const [idx, dbField, parser, isNum] of CSV_COLS) {
      const raw = (row[idx] || '').trim()
      const val = parser(raw)
      if (val !== undefined && val !== '' && val !== null) {
        setClauses.push(`${dbField} = ?`)
        setArgs.push(val)
      }
    }

    if (setClauses.length > 0) {
      setArgs.push(collarNo)
      try {
        await turso.execute({
          sql: `UPDATE cows SET ${setClauses.join(', ')} WHERE collar_no = ?`,
          args: setArgs,
        })
        updated++
      } catch (e) {
        console.error(`Error updating cow ${tagVal} (collar ${collarNo}):`, e)
        errors++
      }
    } else {
      updated++
    }
  } else {
    // --- INSERT new cow ---
    const birthDate = parseAge((row[7] || '').trim()) || ''
    const pdDate = parseDateDMY((row[9] || '').trim())
    const pregnancyResult = mapGynStatus((row[8] || '').trim())
    const expectedCalvingDate = parseMonYear((row[11] || '').trim())
    const calving = parseMonYear((row[12] || '').trim())
    const dailyYield = parseNumber((row[13] || '').trim()) || 0
    const lactNumber = parseNumber((row[14] || '').trim()) || 0
    const dim = parseNumber((row[15] || '').trim()) || 0

    const groupName = (row[2] || '').trim()
    const milkingGroup = (row[3] || '').trim()
    const colour = (row[4] || '').trim()
    const breed = (row[5] || '').trim()
    const origin = (row[6] || '').trim()
    const deadQuarter = (row[16] || '').trim()
    const healthStatus = (row[17] || '').trim()
    const medicalRecord = (row[18] || '').trim()
    const avgWeight = (row[19] || '').trim()

    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const parsedMed = parseMedicalRecord(medicalRecord)
    const medicalRecords = healthStatus || ''
    const remarks = avgWeight ? `Avg. weight: ${avgWeight} kg` : ''

    // Find next id_no
    const maxResult = await turso.execute("SELECT MAX(CAST(id_no AS INTEGER)) as max_id FROM cows")
    const nextIdNo = String((Number(maxResult.rows[0]?.max_id) || 0) + 1).padStart(4, '0')

    try {
      await turso.execute({
        sql: `INSERT INTO cows (
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
          id, USER_ID, nextIdNo, tagVal, collarNo, '', '', 'Female', breed, colour, origin,
          birthDate, groupName, '', '', lactNumber, calving,
          pdDate, '', pregnancyResult, '',
          '', expectedCalvingDate,
          dim, 0, dailyYield, 0,
          0, 0, 0,
          parsedMed.vaccinations, parsedMed.deworming, '', 0,
          deadQuarter, '', medicalRecords,
          groupName, milkingGroup, '', '', remarks,
          '', '', '', '[]',
          '', '',
          now, now,
        ],
      })
      inserted++
    } catch (e) {
      console.error(`Error inserting cow ${tagVal}:`, e)
      errors++
    }
  }
}

function parseMedicalRecord(raw) {
  if (!raw) return { deworming: '', vaccinations: '' }
  const m = raw.trim().match(/^Dewormed\(([^,]+),?\s*(.*)\)$/i)
  if (m) {
    return {
      deworming: `Dewormed(${m[1].trim()})`,
      vaccinations: m[2].trim(),
    }
  }
  return { deworming: '', vaccinations: raw }
}

console.log(`\nDone. ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${errors} errors.`)
turso.close()
