// Small HTTP helpers shared across functions.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

export function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export const ok = (body: unknown) => json(200, body)
export const badRequest = (msg: string, extra?: unknown) =>
  json(400, { error: msg, ...(extra ? { details: extra } : {}) })
export const serverError = (msg: string, extra?: unknown) =>
  json(500, { error: msg, ...(extra ? { details: extra } : {}) })

// Handle CORS preflight; returns a response if it was a preflight, else null.
export function preflight(event: { httpMethod: string }) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }
  return null
}
