import { json } from '../_auth.js'
import account from '../_handlers/account/index.js'
import accountEmail from '../_handlers/account/email.js'
import changePassword from '../_handlers/account/change-password.js'
import resendVerification from '../_handlers/account/resend-verification.js'
import sessions from '../_handlers/account/sessions/index.js'
import revokeSession from '../_handlers/account/sessions/[idHash].js'

function segments(req) {
  const url = new URL(req.url || '/', 'http://localhost')
  const path = url.pathname.replace(/^\/api\/account\/?/, '').replace(/\/$/, '')
  return path ? path.split('/') : []
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const segs = segments(req)
  if (segs.length === 0) return account(req, res)
  if (segs[0] === 'email') return accountEmail(req, res)
  if (segs[0] === 'change-password') return changePassword(req, res)
  if (segs[0] === 'resend-verification') return resendVerification(req, res)
  if (segs[0] === 'sessions') {
    if (segs.length === 1) return sessions(req, res)
    req.query = { ...(req.query || {}), idHash: decodeURIComponent(segs[1]) }
    return revokeSession(req, res)
  }
  return json(res, 404, { error: 'Not found' })
}
