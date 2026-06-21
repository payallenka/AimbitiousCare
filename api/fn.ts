// Single router for all interactive endpoints (Vercel Hobby caps a deployment
// at 12 serverless functions). The frontend posts to /api/fn with
// `__fn: '<name>'` in the JSON body. Handlers are lazy-loaded inside the
// try/catch so any module-load error is RETURNED as JSON instead of crashing
// the function with FUNCTION_INVOCATION_FAILED.

// Static-literal dynamic imports — bundler-analyzable, loaded on demand.
const loaders: Record<string, () => Promise<any>> = {
  'create-checkout': () => import('../netlify/functions/create-checkout'),
  'mock-payment': () => import('../netlify/functions/mock-payment'),
  'connect-onboard': () => import('../netlify/functions/connect-onboard'),
  'connect-status': () => import('../netlify/functions/connect-status'),
  'expert-decision': () => import('../netlify/functions/expert-decision'),
  'complete-session': () => import('../netlify/functions/complete-session'),
  'worker-confirm': () => import('../netlify/functions/worker-confirm'),
  'reschedule-response': () => import('../netlify/functions/reschedule-response'),
  'cancel-appointment': () => import('../netlify/functions/cancel-appointment'),
  'raise-dispute': () => import('../netlify/functions/raise-dispute'),
  'admin-disputes': () => import('../netlify/functions/admin-disputes'),
  'admin-resolve-dispute': () => import('../netlify/functions/admin-resolve-dispute'),
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  try {
    let body: any = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        body = {}
      }
    }
    body = body || {}

    const name = body.__fn || req.query?.name
    const loader = loaders[name]
    if (!loader) {
      res.status(404).json({ error: `Unknown function: ${name}` })
      return
    }

    const mod = await loader()
    const fn = mod.handler || mod.default

    const event = {
      httpMethod: req.method,
      headers: req.headers || {},
      body: JSON.stringify(body),
      isBase64Encoded: false,
    }

    const result = await fn(event, {})
    if (!result) {
      res.status(204).end()
      return
    }
    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v as string)
    }
    res.status(result.statusCode || 200).send(result.body ?? '')
  } catch (err: any) {
    console.error('api/fn error:', err)
    res.status(500).json({
      error: 'fn failed',
      message: err?.message || String(err),
      stack: String(err?.stack || '').split('\n').slice(0, 8),
    })
  }
}
