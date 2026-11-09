import { readFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const values = {}
  try {
    const raw = readFileSync(join(root, '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
      if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '').trim()
    }
  } catch {
    console.error('No .env file found.')
    process.exit(1)
  }
  return values
}

const required = ['TURSO_URL', 'TURSO_AUTH_TOKEN', 'SESSION_SECRET', 'IMGBB_API_KEY']
const optional = ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'APP_URL', 'VITE_APP_URL', 'VITE_API_URL']
const legacy = {
  TURSO_DATABASE_URL: 'TURSO_URL',
  LIBSQL_URL: 'TURSO_URL',
  VITE_TURSO_URL: 'TURSO_URL',
  TURSO_TOKEN: 'TURSO_AUTH_TOKEN',
  LIBSQL_AUTH_TOKEN: 'TURSO_AUTH_TOKEN',
  VITE_TURSO_AUTH_TOKEN: 'TURSO_AUTH_TOKEN',
  AUTH_SECRET: 'SESSION_SECRET',
  IMGBB_KEY: 'IMGBB_API_KEY',
  VITE_IMGBB_API_KEY: 'IMGBB_API_KEY',
}

const env = loadEnv()
let failed = false

for (const key of required) {
  const ok = Boolean(env[key])
  console.log(`${ok ? 'OK  ' : 'MISS'} ${key}`)
  if (!ok) failed = true
}
for (const key of optional) {
  console.log(`${env[key] ? 'OK  ' : 'opt '} ${key}`)
}
for (const [oldName, canonical] of Object.entries(legacy)) {
  if (env[oldName]) {
    console.log(`WARN legacy ${oldName} — rename to ${canonical}`)
  }
}

if (failed) process.exit(1)
