// Single source of truth for environment variable names.
// Canonical names are listed first. Legacy aliases remain accepted so
// existing deployments keep working while they are renamed.

export function envValue(...names) {
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

export function sessionSecret() {
  return envValue('SESSION_SECRET', 'AUTH_SECRET')
}

export function isSessionConfigured() {
  return Boolean(sessionSecret())
}

export function imgbbKey() {
  return envValue('IMGBB_API_KEY', 'IMGBB_KEY', 'VITE_IMGBB_API_KEY')
}

export function resendKey() {
  return envValue('RESEND_API_KEY')
}

export function resendFrom() {
  return envValue('RESEND_FROM_EMAIL')
}

export function isEmailConfigured() {
  return Boolean(resendKey() && resendFrom())
}

export function appUrl() {
  return envValue('APP_URL', 'VITE_APP_URL').replace(/\/$/, '')
}
