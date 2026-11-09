import { json } from '../_auth.js'
import login from '../_handlers/auth/login.js'
import register from '../_handlers/auth/register.js'
import logout from '../_handlers/auth/logout.js'
import logoutAll from '../_handlers/auth/logout-all.js'
import me from '../_handlers/auth/me.js'
import verifyEmail from '../_handlers/auth/verify-email.js'
import forgotPassword from '../_handlers/auth/forgot-password.js'
import resetPassword from '../_handlers/auth/reset-password.js'

const ROUTES = {
  login,
  register,
  logout,
  'logout-all': logoutAll,
  me,
  'verify-email': verifyEmail,
  'forgot-password': forgotPassword,
  'reset-password': resetPassword,
}

function segments(req) {
  const url = new URL(req.url || '/', 'http://localhost')
  const path = url.pathname.replace(/^\/api\/auth\/?/, '').replace(/\/$/, '')
  return path ? path.split('/') : []
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const [route] = segments(req)
  const fn = ROUTES[route]
  if (!fn) return json(res, 404, { error: 'Not found' })
  return fn(req, res)
}
