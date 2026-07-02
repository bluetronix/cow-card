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
const ISSUED_BY = 'Nicholous Mria'
const TODAY = new Date().toISOString().split('T')[0]

const MONTHS = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

const COLOUR_MAP = {
  'black and white': 'Black and White',
  'brown and white': 'Brown and White',
  'brown wnd white': 'Brown and White',
  'brown and black': 'Black and Brown',
  'black and brown': 'Black and Brown',
  'brown': 'Brown',
  'black': 'Black',
  'white': 'White',
  'red': 'Red',
  'grey': 'Grey',
}

const BREED_MAP = {
  'ayshire': 'Ayrshire',
}

function normalizeColour(val) {
  if (!val) return ''
  const trimmed = val.trim()
  return COLOUR_MAP[trimmed.toLowerCase()] || trimmed
}

function normalizeBreed(val) {
  if (!val) return ''
  const trimmed = val.trim()
  return BREED_MAP[trimmed.toLowerCase()] || trimmed
}

function parseMonYear(val) {
  if (!val) return ''
  const m = val.trim().match(/^([A-Za-z]{3})-(\d{2})$/)
  if (!m) {
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

function isAbortion(gyn) {
  return (gyn || '').trim().toLowerCase() === 'abortion'
}

function inferHealthStatus(text) {
  if (!text) return 'Healthy'
  const t = text.toLowerCase()
  if (t.includes('diagnosed')) return 'On Treatment'
  if (t.includes('recurring') || t.includes('recurrent')) {
    if (t.includes('previous')) return 'Healthy'
    return 'Frequently Sick'
  }
  if (t.includes('previous')) return 'Healthy'
  if (t.includes('mastitis')) return 'Healthy'
  if (t.includes('actinomycosis')) return 'On Treatment'
  return 'On Treatment'
}

function extractMastitisText(text) {
  if (!text) return ''
  return text.toLowerCase().includes('mastitis') ? text.trim() : ''
}

function extractPregnancyStage(val) {
  if (!val) return ''
  const t = val.trim()
  const m = t.match(/^(\d+)\s*month/i)
  if (m) return `Pregnancy stage: ${m[1]} month(s)`
  return ''
}

function buildLactationHistory(lactNumber, calvingDate, dailyYield, dim) {
  if (!lactNumber && !calvingDate && !dailyYield && !dim) return '[]'
  const remarks = [
    dim ? `DIM: ${dim}` : '',
    dailyYield ? `Avg yield: ${dailyYield} L` : '',
  ].filter(Boolean).join(', ')
  return JSON.stringify([{
    number: lactNumber || 0,
    calving_date: calvingDate || '',
    yield_305d: 0,
    peak_yield: 0,
    total_yield: 0,
    remarks,
  }])
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

// ---- MAIN ----

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
  if (row.length < 16) { skipped++; continue }

  const collarNo = (row[1] || '').trim()
  if (!collarNo) { skipped++; continue }

  const tagVal = (row[0] || '').trim()
  if (!tagVal) { skipped++; continue }

  // Parse all CSV columns upfront
  const colour = normalizeColour(row[4] || '')
  const breed = normalizeBreed(row[5] || '')
  const origin = (row[6] || '').trim()
  const groupName = (row[2] || '').trim()
  const milkingGroup = (row[3] || '').trim()
  const gynStatus = (row[8] || '').trim()
  const birthDate = parseAge((row[7] || '').trim()) || ''
  const pdDate = parseDateDMY((row[9] || '').trim())
  const pregnancyResult = mapGynStatus(gynStatus)
  const col10 = (row[10] || '').trim()
  const expectedCalvingDate = parseMonYear((row[11] || '').trim())
  const calving = parseMonYear((row[12] || '').trim())
  const dailyYield = parseNumber((row[13] || '').trim())
  const lactNumber = parseNumber((row[14] || '').trim())
  const dim = parseNumber((row[15] || '').trim())
  const deadQuarter = (row[16] || '').trim()
  const healthRaw = (row[17] || '').trim()
  const medRaw = (row[18] || '').trim()
  const avgWeight = (row[19] || '').trim()

  // Derived values
  const currentHealthStatus = inferHealthStatus(healthRaw)
  const mastitisText = extractMastitisText(healthRaw)
  const pregnancyStage = extractPregnancyStage(col10)
  const abortionCount = isAbortion(gynStatus) ? 1 : 0

  let vetRecs = healthRaw || ''
  if (pregnancyStage) {
    vetRecs = vetRecs ? `${vetRecs}; ${pregnancyStage}` : pregnancyStage
  }

  const lactationHistory = buildLactationHistory(lactNumber, calving, dailyYield, dim)

  const existing = await turso.execute({
    sql: 'SELECT id, id_no FROM cows WHERE collar_no = ?',
    args: [collarNo],
  })

  const now = new Date().toISOString()

  if (existing.rows.length > 0) {
    // --- UPDATE ---
    const setClauses = []
    const setArgs = []

    // Data fields (only if CSV cell has data)
    if (tagVal) { setClauses.push('tag = ?'); setArgs.push(tagVal) }
    if (groupName) { setClauses.push('group_name = ?', 'feeding_group = ?'); setArgs.push(groupName, groupName) }
    if (milkingGroup) { setClauses.push('milking_group = ?'); setArgs.push(milkingGroup) }
    if (colour) { setClauses.push('colour = ?'); setArgs.push(colour) }
    if (breed) { setClauses.push('breed = ?'); setArgs.push(breed) }
    if (origin) { setClauses.push('origin = ?'); setArgs.push(origin) }
    if (birthDate) { setClauses.push('birth_date = ?'); setArgs.push(birthDate) }
    if (pdDate) { setClauses.push('pd_date = ?'); setArgs.push(pdDate) }
    if (expectedCalvingDate) { setClauses.push('expected_calving_date = ?'); setArgs.push(expectedCalvingDate) }
    if (calving) { setClauses.push('calving_date = ?'); setArgs.push(calving) }
    if (dailyYield !== undefined) { setClauses.push('current_daily_milk_yield = ?'); setArgs.push(dailyYield) }
    if (lactNumber !== undefined) { setClauses.push('lactations = ?'); setArgs.push(lactNumber) }
    if (dim !== undefined) { setClauses.push('days_in_milk = ?'); setArgs.push(dim) }
    if (deadQuarter) { setClauses.push('dead_qtr_teat = ?'); setArgs.push(deadQuarter) }
    const remarks = avgWeight && avgWeight !== '--' ? `Avg. weight: ${avgWeight} kg` : ''
    if (remarks) { setClauses.push('remarks = ?'); setArgs.push(remarks) }

    // Always-set fields
    setClauses.push('pregnancy_result = ?'); setArgs.push(pregnancyResult)
    setClauses.push('current_health_status = ?'); setArgs.push(currentHealthStatus)
    setClauses.push('issued_date = ?'); setArgs.push(TODAY)
    setClauses.push('issued_by = ?'); setArgs.push(ISSUED_BY)
    setClauses.push('lactation_history = ?'); setArgs.push(lactationHistory)
    setClauses.push('abortion_count = ?'); setArgs.push(abortionCount)
    setClauses.push('updated_at = ?'); setArgs.push(now)

    if (mastitisText) { setClauses.push('mastitis_history = ?'); setArgs.push(mastitisText) }
    if (vetRecs) { setClauses.push('vet_recommendations = ?'); setArgs.push(vetRecs) }
    if (healthRaw) { setClauses.push('medical_records = ?'); setArgs.push(healthRaw) }

    // Medical record parsing
    const parsedMed = parseMedicalRecord(medRaw)
    if (parsedMed.deworming) { setClauses.push('deworming_dates = ?'); setArgs.push(parsedMed.deworming) }
    if (parsedMed.vaccinations) { setClauses.push('vaccinations = ?'); setArgs.push(parsedMed.vaccinations) }

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
    // --- INSERT ---
    const id = crypto.randomUUID()

    const maxResult = await turso.execute("SELECT MAX(CAST(id_no AS INTEGER)) as max_id FROM cows")
    const nextIdNo = String((Number(maxResult.rows[0]?.max_id) || 0) + 1).padStart(4, '0')

    const parsedMed = parseMedicalRecord(medRaw)
    const remarksVal = avgWeight && avgWeight !== '--' ? `Avg. weight: ${avgWeight} kg` : ''

    try {
      await turso.execute({
        sql: `INSERT INTO cows (
          id, user_id, id_no, tag, collar_no, rfid_no, name, sex, breed, colour, origin,
          birth_date, group_name, dam_id, dam_breed, sire_id, sire_breed, lactations, calving_date,
          pd_date, pd_group, pregnancy_result, ai_service_date,
          expected_dry_off_date, expected_calving_date,
          days_in_milk, peak_milk_yield, current_daily_milk_yield, total_lactation_yield,
          fat_percent, protein_percent, projected_305d_milk_yield,
          vaccinations, deworming_dates, mastitis_history, body_condition_score,
          dead_qtr_teat, quarter_teat_status, medical_records, vet_recommendations,
          feeding_group, milking_group, barn_name, housing, cull_status, abortion_count, remarks,
          issued_date, issued_by, image_url, lactation_history,
          current_health_status, last_checkup_date,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id, USER_ID, nextIdNo, tagVal, collarNo, '', '', 'Female', breed, colour, origin,
          birthDate, groupName, '', '', '', '', lactNumber || 0, calving,
          pdDate, '', pregnancyResult, '',
          '', expectedCalvingDate,
          dim || 0, 0, dailyYield || 0, 0,
          0, 0, 0,
          parsedMed.vaccinations, parsedMed.deworming, mastitisText, 0,
          deadQuarter, '', healthRaw || '', vetRecs,
          groupName, milkingGroup, '', '', '-', abortionCount, remarksVal,
          TODAY, ISSUED_BY, '', lactationHistory,
          currentHealthStatus, '',
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

console.log(`\nDone. ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${errors} errors.`)
turso.close()
