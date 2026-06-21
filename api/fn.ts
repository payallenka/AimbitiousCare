// Single router function for all interactive endpoints. Vercel's Hobby plan
// caps a deployment at 12 serverless functions, so instead of one file per
// endpoint we dispatch by name here (kept separate: cron, stripe-webhook).
//
// The frontend posts to /api/fn with `__fn: '<name>'` in the JSON body (or
// ?name=<name>). Each underlying handler ignores the extra `__fn` field.

import { handler as createCheckout } from '../netlify/functions/create-checkout'
import { handler as mockPayment } from '../netlify/functions/mock-payment'
import { handler as connectOnboard } from '../netlify/functions/connect-onboard'
import { handler as connectStatus } from '../netlify/functions/connect-status'
import { handler as expertDecision } from '../netlify/functions/expert-decision'
import { handler as completeSession } from '../netlify/functions/complete-session'
import { handler as workerConfirm } from '../netlify/functions/worker-confirm'
import { handler as rescheduleResponse } from '../netlify/functions/reschedule-response'
import { handler as cancelAppointment } from '../netlify/functions/cancel-appointment'
import { handler as raiseDispute } from '../netlify/functions/raise-dispute'
import { handler as adminDisputes } from '../netlify/functions/admin-disputes'
import { handler as adminResolveDispute } from '../netlify/functions/admin-resolve-dispute'

const handlers: Record<string, any> = {
  'create-checkout': createCheckout,
  'mock-payment': mockPayment,
  'connect-onboard': connectOnboard,
  'connect-status': connectStatus,
  'expert-decision': expertDecision,
  'complete-session': completeSession,
  'worker-confirm': workerConfirm,
  'reschedule-response': rescheduleResponse,
  'cancel-appointment': cancelAppointment,
  'raise-dispute': raiseDispute,
  'admin-disputes': adminDisputes,
  'admin-resolve-dispute': adminResolveDispute,
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

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
  const fn = handlers[name]
  if (!fn) {
    res.status(404).json({ error: `Unknown function: ${name}` })
    return
  }

  const event = {
    httpMethod: req.method,
    headers: req.headers || {},
    body: JSON.stringify(body),
    isBase64Encoded: false,
  }

  try {
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
    console.error(`api/fn[${name}] error:`, err)
    res.status(500).json({ error: 'Internal error', details: err?.message })
  }
}
