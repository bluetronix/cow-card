import { createClient } from '@libsql/client'
import { writeFileSync, readFileSync } from 'fs'
import { resolve } from 'path'
import Papa from 'papaparse'

const envPath = resolve(import.meta.dirname, '..', '.env')
try {
  const envRaw = readFileSync(envPath, 'utf8')
  for (const line of envRaw.split('\n')) {
    const m = line.match(/^\s*VITE_(\w+)\s*=\s*(.+)/)
    if (m) process.env[`VITE_${m[1]}`] = m[2].replace(/^["']|["']$/g, '').trim()
  }
} catch { /* .env not found, fall back to process.env */ }

const TURSO_URL = process.env.VITE_TURSO_URL
const TURSO_TOKEN = process.env.VITE_TURSO_AUTH_TOKEN

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('Missing VITE_TURSO_URL or VITE_TURSO_AUTH_TOKEN in .env')
  process.exit(1)
}

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
const outDir = resolve(import.meta.dirname)
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

async function exportTable(name) {
  const result = await turso.execute(`SELECT * FROM ${name} ORDER BY created_at`)
  const rows = result.rows
  const columns = result.columns
  const data = rows.map(r => {
    const obj = {}
    for (const col of columns) obj[col] = r[col]
    return obj
  })
  const csv = Papa.unparse(data)
  const file = resolve(outDir, `${name}_${timestamp}.csv`)
  writeFileSync(file, csv, 'utf8')
  writeFileSync(resolve(outDir, `${name}_latest.csv`), csv, 'utf8')
  console.log(`  ${name}: ${rows.length} rows → ${name}_${timestamp}.csv`)
}

console.log(`Exporting Turso database to .backup/ ...`)
console.log(`Timestamp: ${timestamp}`)
console.log()

await exportTable('cows')
await exportTable('daily_records')

console.log()
console.log('Done.')
turso.close()
