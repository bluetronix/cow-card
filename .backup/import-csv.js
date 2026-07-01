import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
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

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Usage: node .backup/import-csv.js <path-to-csv>')
  process.exit(1)
}

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
const csvRaw = readFileSync(resolve(csvPath), 'utf8')
const parsed = Papa.parse(csvRaw, { header: true, skipEmptyLines: true, dynamicTyping: false })

if (parsed.errors.length) {
  console.error('CSV parse errors:', parsed.errors)
}

const rows = parsed.data
const columns = parsed.meta.fields
if (!columns || columns.length === 0) {
  console.error('No columns found in CSV header')
  process.exit(1)
}

const table = columns.includes('cow_id') ? 'daily_records' : 'cows'

console.log(`Table: ${table}`)
console.log(`Columns: ${columns.join(', ')}`)
console.log(`Rows: ${rows.length}`)
console.log()

let imported = 0
let errors = 0

for (const row of rows) {
  const placeholders = columns.map(() => '?').join(', ')
  const values = columns.map(col => {
    const v = row[col]
    return v === '' || v === undefined || v === null ? '' : v
  })

  try {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      args: values,
    })
    imported++
  } catch (e) {
    console.error(`Error row ${imported + errors + 1} (${row.id || row.cow_id || '?'}):`, e)
    errors++
  }
}

console.log(`Done. ${imported} imported, ${errors} failed.`)
turso.close()
