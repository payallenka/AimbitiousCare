import { MOCK_PAYMENTS } from './_shared/stripe.js'
import { supabaseAdmin } from './_shared/supabaseAdmin.js'
import { getCallingUser } from './_shared/domain.js'
import { releasePayout } from './_shared/payout.js'
import { notify } from './_shared/notify.js'
import { ok, badRequest, serverError, preflight } from './_shared/http.js'

interface Body {
  appointmentId: string
}

// Worker's independent session confirmation. Either party can confirm in any
// order; the session only completes + pays out once BOTH the expert (with
// summary/notes/duration) and the worker have confirmed (the AND condition).
export const handler: any = async (event) => {
  const pre = preflight(event)
  if (pre) return pre
  if (event.httpMethod !== 'POST') return badRequest('Method not allowed')

  try {
    const caller = await getCallingUser(event.headers.authorization)
    if (!caller) return badRequest('Not authenticated')

    const body: Body = JSON.parse(event.body || '{}')
    if (!body.appointmentId) return badRequest('Missing appointmentId')

    const { data: appt } = await supabaseAdmin
      .from('appointment_requests')
      .select(
        'id, patient_id, professional_id, status, session_completed_at, session_summary, worker_confirmed_at, confirmed_date, confirmed_time, requested_date, requested_time, duration_minutes',
      )
      .eq('id', body.appointmentId)
      .maybeSingle()
    if (!appt) return badRequest('Appointment not found')
    if (appt.patient_id !== caller.userId) return badRequest('Not your appointment')
    if (!['confirmed', 'awaiting_confirmation'].includes(appt.status)) {
      return badRequest('This session cannot be confirmed in its current state')
    }
    if (appt.worker_confirmed_at) return ok({ status: appt.status, alreadyConfirmed: true })

    // Can only confirm after the session has ended (bypassed in mock).
    if (!MOCK_PAYMENTS) {
      const dateStr = appt.confirmed_date || appt.requested_date
      const timeStr = appt.confirmed_time || appt.requested_time
      const endMs =
        new Date(`${dateStr}T${timeStr}`).getTime() + (appt.duration_minutes || 60) * 60000
      if (Date.now() < endMs) {
        return badRequest('You can confirm only after the session has ended')
      }
    }

    const now = new Date().toISOString()
    const expertConfirmed = !!appt.session_completed_at && !!appt.session_summary

    if (expertConfirmed) {
      // Both sides confirmed → complete + release.
      await supabaseAdmin
        .from('appointment_requests')
        .update({ status: 'completed', worker_confirmed_at: now })
        .eq('id', appt.id)
      const result = await releasePayout(appt.id)
      return ok({ status: 'completed', bothConfirmed: true, payout: result })
    }

    // Worker confirmed first — wait for the expert to complete + upload summary.
    await supabaseAdmin
      .from('appointment_requests')
      .update({ worker_confirmed_at: now })
      .eq('id', appt.id)
    await notify({
      userId: appt.professional_id,
      type: 'session_completion_request',
      title: 'Worker confirmed the session',
      body: 'The worker has confirmed the session. Please complete it and upload your summary to receive payout.',
      appointmentId: appt.id,
      link: '/appointment-inbox',
    })
    return ok({ status: appt.status, bothConfirmed: false, waitingFor: 'expert' })
  } catch (err: any) {
    console.error('worker-confirm error:', err)
    return serverError('Failed to confirm session', err.message)
  }
}
