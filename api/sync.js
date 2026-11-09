import { json } from './_auth.js'
import push from './_handlers/sync/push.js'
import pull from './_handlers/sync/pull.js'

function action(req) {
  const url = new URL(req.url || '/', 'http://localhost')
  return req.query?.action || url.searchParams.get('action') || url.pathname.split('/').filter(Boolean).pop() || ''
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
  const a = action(req)
  if (a === 'push') return push(req, res)
  if (a === 'pull') return pull(req, res)
  return json(res, 404, { error: 'Not found' })
}
