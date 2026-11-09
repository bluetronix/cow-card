import { json } from './_auth.js'
import account from './_handlers/account/index.js'
import accountEmail from './_handlers/account/email.js'
import changePassword from './_handlers/account/change-password.js'
import resendVerification from './_handlers/account/resend-verification.js'
import sessions from './_handlers/account/sessions/index.js'
import revokeSession from './_handlers/account/sessions/[idHash].js'

function action(req) {
  const url = new URL(req.url || '/', 'http://localhost')
  return req.query?.action || url.searchParams.get('action') || ''
}

function id(req) {
  const url = new URL(req.url || '/', 'http://localhost')
  return req.query?.id || url.searchParams.get('id') || url.pathname.split('/').filter(Boolean).pop() || ''
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
  const a = action(req)
  if (!a || a === 'profile') return account(req, res)
  if (a === 'email') return accountEmail(req, res)
  if (a === 'change-password') return changePassword(req, res)
  if (a === 'resend-verification') return resendVerification(req, res)
  if (a === 'sessions') {
    const sid = req.query?.id || new URL(req.url || '/', 'http://localhost').searchParams.get('id') || ''
    if (!sid) return sessions(req, res)
    req.query = { ...(req.query || {}), idHash: sid }
    return revokeSession(req, res)
  }
  return json(res, 404, { error: 'Not found' })
}
