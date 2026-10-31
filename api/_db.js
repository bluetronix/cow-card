import { createClient } from '@libsql/client'

let client = null

export function getDb() {
  if (!client) {
    const url = process.env.TURSO_URL
    if (!url) throw new Error('TURSO_URL is not configured')
    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    })
  }
  return client
}
