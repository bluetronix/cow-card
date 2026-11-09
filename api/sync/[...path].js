import { json } from '../_auth.js'
import push from '../_handlers/sync/push.js'
import pull from '../_handlers/sync/pull.js'

function segments(req) {
  const url = new URL(req.url || '/', 'http://localhost')
  const path = url.pathname.replace(/^\/api\/sync\/?/, '').replace(/\/$/, '')
  return path ? path.split('/') : []
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const [route] = segments(req)
  if (route === 'push') return push(req, res)
  if (route === 'pull') return pull(req, res)
  return json(res, 404, { error: 'Not found' })
}
