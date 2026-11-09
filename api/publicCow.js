import handler from './_handlers/cows/public/[id].js'

export default async function wrapped(req, res) {
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
  if (!req.query?.id) {
    const url = new URL(req.url || '/', 'http://localhost')
    const id = url.searchParams.get('id') || url.pathname.split('/').filter(Boolean).pop() || ''
    req.query = { ...(req.query || {}), id }
  }
  return handler(req, res)
}
