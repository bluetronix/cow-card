import { createClient } from '@libsql/client'

let client = null

function envValue(...names) {
  for (const name of names) {
    const value = process.env[name]
    if (value && String(value).trim()) {
      return String(value).trim().replace(/^["']|["']$/g, '')
    }
  }
  return ''
}

export function dbEnv() {
  return {
    url: envValue('TURSO_URL', 'TURSO_DATABASE_URL', 'LIBSQL_URL', 'VITE_TURSO_URL'),
    token: envValue('TURSO_AUTH_TOKEN', 'TURSO_TOKEN', 'LIBSQL_AUTH_TOKEN', 'VITE_TURSO_AUTH_TOKEN'),
  }
}

export function isDbConfigured() {
  return Boolean(dbEnv().url)
}

export function getDb() {
  if (!client) {
    const { url, token } = dbEnv()
    if (!url) {
      throw new Error('Database is not configured. Set TURSO_URL and TURSO_AUTH_TOKEN in the deployment environment.')
    }
    client = createClient({
      url,
      ...(token && !url.startsWith('file:') ? { authToken: token } : {}),
    })
  }
  return client
}
