// Single router for all interactive endpoints (Vercel Hobby caps a deployment
// at 12 serverless functions). Posts to /api/fn with `__fn: '<name>'`.
//
// Handlers live under api/_impl and are imported STATICALLY so Vercel compiles
// and includes them (it runs native ESM and only traces static imports; and
// they must live inside api/, since cross-directory imports aren't deployed).

import { handler as createCheckout } from './_impl/create-checkout.js'
import { handler as mockPayment } from './_impl/mock-payment.js'
import { handler as connectOnboard } from './_impl/connect-onboard.js'
import { handler as connectStatus } from './_impl/connect-status.js'
import { handler as expertDecision } from './_impl/expert-decision.js'
import { handler as completeSession } from './_impl/complete-session.js'
import { handler as workerConfirm } from './_impl/worker-confirm.js'
import { handler as rescheduleResponse } from './_impl/reschedule-response.js'
import { handler as cancelAppointment } from './_impl/cancel-appointment.js'
import { handler as raiseDispute } from './_impl/raise-dispute.js'
import { handler as adminDisputes } from './_impl/admin-disputes.js'
import { handler as adminResolveDispute } from './_impl/admin-resolve-dispute.js'

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
