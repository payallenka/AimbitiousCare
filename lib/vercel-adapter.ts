// Adapts a Netlify-style function handler ((event) => {statusCode, headers, body})
// to a Vercel Node serverless handler ((req, res)). Lets us reuse all the
// existing netlify/functions logic unchanged on Vercel.

// Loosely typed to accept Netlify's Handler ((event, context) => void | Promise<...>).
type NetlifyHandler = (event: any, context?: any) => any

async function readRawBody(req: any): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export function toVercel(handler: NetlifyHandler, opts: { rawBody?: boolean } = {}) {
  return async (req: any, res: any) => {
    let body = ''
    if (opts.rawBody) {
      // Stripe webhook needs the unparsed body for signature verification.
      body = await readRawBody(req)
    } else if (req.body !== undefined && req.body !== null) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    }

    const event = {
      httpMethod: req.method,
      headers: req.headers || {},
      body,
      isBase64Encoded: false,
    }

    try {
      const result = await handler(event, {})
      if (!result) {
        res.status(204).end()
        return
      }
      if (result.headers) {
        for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v)
      }
      res.status(result.statusCode || 200)
      res.send(result.body ?? '')
    } catch (err: any) {
      console.error('vercel-adapter error:', err)
      res.status(500).json({ error: 'Internal error', details: err?.message })
    }
  }
}
