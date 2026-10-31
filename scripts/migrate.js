import { createClient } from '@libsql/client'
import { readFileSync, readdirSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  try {
    const raw = readFileSync(join(root, '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
      if (!match) continue
      const [, key, value] = match
      if (process.env[key] === undefined) {
        process.env[key] = value.replace(/^["']|["']$/g, '').trim()
      }
    }
  } catch {
    // .env is optional when credentials are provided by the environment/CLI.
  }
}

function splitStatements(sql) {
  return sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean)
}

function isIgnorableError(statement, message) {
  if (/duplicate column name|already exists/i.test(message)) return true
  // Old databases may not yet have every column an index references.
  // The index pass is retried after the migrations add the columns.
  if (/^CREATE INDEX/i.test(statement) && /no such column/i.test(message)) return true
  return false
}

async function runSqlFile(client, file) {
  const sql = readFileSync(file, 'utf8')
  for (const statement of splitStatements(sql)) {
    try {
      await client.execute(statement)
    } catch (error) {
      const message = String(error?.message || error)
      if (isIgnorableError(statement, message)) continue
      throw new Error(`Failed in ${file}:\n${message}\n\nStatement:\n${statement.slice(0, 400)}`)
    }
  }
}

async function ensureMigrationsTable(client) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `)
}

async function migrationApplied(client, id) {
  const result = await client.execute({
    sql: 'SELECT 1 FROM schema_migrations WHERE id = ?',
    args: [id],
  })
  return result.rows.length > 0
}

async function markMigration(client, id) {
  await client.execute({
    sql: 'INSERT OR IGNORE INTO schema_migrations (id) VALUES (?)',
    args: [id],
  })
}

async function columnNames(client, table) {
  const result = await client.execute(`PRAGMA table_info(${table})`)
  return new Set(result.rows.map(row => String(row.name)))
}

async function backfill(client) {
  const cowColumns = await columnNames(client, 'cows')

  if (cowColumns.has('pen_barn_no') && cowColumns.has('barn_name')) {
    await client.execute(`
      UPDATE cows
      SET barn_name = pen_barn_no
      WHERE (barn_name = '' OR barn_name IS NULL)
        AND pen_barn_no IS NOT NULL
        AND pen_barn_no <> ''
    `)
    console.log('backfill: cows.barn_name <- pen_barn_no')
  }

  if (cowColumns.has('bull_name') && cowColumns.has('sire_id')) {
    await client.execute(`
      UPDATE cows
      SET sire_id = bull_name
      WHERE (sire_id = '' OR sire_id IS NULL)
        AND bull_name IS NOT NULL
        AND bull_name <> ''
    `)
    console.log('backfill: cows.sire_id <- bull_name')
  }

  await client.execute(`
    UPDATE cows
    SET category = 'Bull'
    WHERE sex = 'Male'
      AND (category IS NULL OR category = '' OR category = 'Cow')
  `)
  await client.execute(`
    UPDATE cows
    SET category = 'Cow'
    WHERE (sex IS NULL OR sex <> 'Male')
      AND (category IS NULL OR category = '')
  `)

  const tables = [
    'users',
    'cows',
    'daily_records',
    'vet_visits',
    'health_incidents',
    'treatments',
    'lameness_sessions',
    'vaccination_records',
    'groups',
  ]

  for (const table of tables) {
    const columns = await columnNames(client, table)
    if (columns.has('updated_at') && columns.has('created_at')) {
      await client.execute(`
        UPDATE ${table}
        SET updated_at = created_at
        WHERE (updated_at = '' OR updated_at IS NULL)
          AND created_at IS NOT NULL
          AND created_at <> ''
      `)
    }
  }
}

async function main() {
  loadEnv()

  const url = process.argv[2] || process.env.TURSO_URL || process.env.VITE_TURSO_URL
  if (!url) {
    console.error('Missing database URL. Pass one as an argument or set TURSO_URL/VITE_TURSO_URL.')
    process.exit(1)
  }

  const token = process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN || ''
  const client = createClient({
    url,
    ...(token && !url.startsWith('file:') ? { authToken: token } : {}),
  })

  try {
    console.log(`Migrating: ${url}`)
    await ensureMigrationsTable(client)

    // Baseline is idempotent (CREATE TABLE/INDEX IF NOT EXISTS).
    await runSqlFile(client, join(root, 'schema.sql'))
    await markMigration(client, '000_baseline_schema')

    const migrationsDir = join(root, 'migrations')
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const id = file.replace(/\.sql$/, '')
      if (await migrationApplied(client, id)) {
        console.log(`skip   ${id}`)
        continue
      }
      console.log(`apply  ${id}`)
      await runSqlFile(client, join(migrationsDir, file))
      await markMigration(client, id)
    }

    await backfill(client)

    // Retry the baseline so indexes skipped during the first pass are created
    // now that the migration/backfill columns exist.
    await runSqlFile(client, join(root, 'schema.sql'))

    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    const applied = await client.execute(
      'SELECT id FROM schema_migrations ORDER BY id',
    )
    console.log('tables:', tables.rows.map(row => row.name).join(', '))
    console.log('migrations:', applied.rows.map(row => row.id).join(', '))
    console.log('Migration complete.')
  } finally {
    client.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
