import { json } from './_auth.js'
import login from './_handlers/auth/login.js'
import register from './_handlers/auth/register.js'
import logout from './_handlers/auth/logout.js'
import logoutAll from './_handlers/auth/logout-all.js'
import me from './_handlers/auth/me.js'
import verifyEmail from './_handlers/auth/verify-email.js'
import forgotPassword from './_handlers/auth/forgot-password.js'
import resetPassword from './_handlers/auth/reset-password.js'

import account from './_handlers/account/index.js'
import accountEmail from './_handlers/account/email.js'
import changePassword from './_handlers/account/change-password.js'
import resendVerification from './_handlers/account/resend-verification.js'
import sessions from './_handlers/account/sessions/index.js'
import revokeSession from './_handlers/account/sessions/[idHash].js'

import push from './_handlers/sync/push.js'
import pull from './_handlers/sync/pull.js'

import publicCow from './_handlers/cows/public/[id].js'

function segments(req) {
  const url = new URL(req.url || '/', 'http://localhost')
  const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '')
  return path ? path.split('/') : []
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const segs = segments(req)
  const [a, b, c] = segs

  // /api/health and /api/upload are separate functions; handle here too as fallback.
  if (a === 'health') {
    const m = await import('./_handlers/health.js')
    return m.default(req, res)
  }
  if (a === 'upload') {
    const m = await import('./_handlers/upload.js')
    return m.default(req, res)
  }

  if (a === 'auth') {
    const route = b
    const map = {
      login,
      register,
      logout,
      'logout-all': logoutAll,
      me,
      'verify-email': verifyEmail,
      'forgot-password': forgotPassword,
      'reset-password': resetPassword,
    }
    const fn = map[route]
    if (!fn) return json(res, 404, { error: 'Not found' })
    return fn(req, res)
  }

  if (a === 'account') {
    if (!b) return account(req, res)
    if (b === 'email') return accountEmail(req, res)
    if (b === 'change-password') return changePassword(req, res)
    if (b === 'resend-verification') return resendVerification(req, res)
    if (b === 'sessions') {
      if (!c) return sessions(req, res)
      req.query = { ...(req.query || {}), idHash: decodeURIComponent(c) }
      return revokeSession(req, res)
    }
    return json(res, 404, { error: 'Not found' })
  }

  if (a === 'sync') {
    if (b === 'push') return push(req, res)
    if (b === 'pull') return pull(req, res)
    return json(res, 404, { error: 'Not found' })
  }

  if (a === 'cows' && b === 'public' && c) {
    req.query = { ...(req.query || {}), id: decodeURIComponent(c) }
    return publicCow(req, res)
  }

  return json(res, 404, { error: 'Not found' })
}
