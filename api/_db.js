import { createClient } from '@libsql/client'
import { dbEnv } from './_env.js'

let client = null

export { dbEnv, isDbConfigured, envValue } from './_env.js'

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
