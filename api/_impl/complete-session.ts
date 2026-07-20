import { MOCK_PAYMENTS } from './_shared/stripe.js'
import { supabaseAdmin } from './_shared/supabaseAdmin.js'
import { getCallingUser } from './_shared/domain.js'
import { releasePayout } from './_shared/payout.js'
import { notify, notifyAdmins } from './_shared/notify.js'
import { ok, badRequest, serverError, preflight } from './_shared/http.js'

interface Body {
  appointmentId: string
  sessionSummary: string
  sessionNotes: string
  durationMinutes: number
}

// Expert marks a confirmed session complete and uploads the required summary,
// notes and duration. Moves to 'awaiting_confirmation' and arms the 72h
// auto-release timer (worker may confirm sooner, or dispute within the window).
export const handler: any = async (event: any) => {
  const pre = preflight(event)
  if (pre) return pre
  if (event.httpMethod !== 'POST') return badRequest('Method not allowed')

  try {
    const caller = await getCallingUser(event.headers.authorization)
    if (!caller) return badRequest('Not authenticated')

    const body: Body = JSON.parse(event.body || '{}')
    if (!body.appointmentId) return badRequest('Missing appointmentId')
    if (!body.sessionSummary || !body.sessionNotes || !body.durationMinutes) {
      return badRequest('Session summary, notes and duration are all required')
    }

    const { data: appt } = await supabaseAdmin
      .from('appointment_requests')
      .select(
        'id, professional_id, patient_id, status, payment_status, worker_confirmed_at, confirmed_date, confirmed_time, requested_date, requested_time, duration_minutes',
      )
      .eq('id', body.appointmentId)
      .maybeSingle()
    if (!appt) return badRequest('Appointment not found')
    if (appt.professional_id !== caller.userId) return badRequest('Not your appointment')
    if (appt.status !== 'confirmed') return badRequest('Only confirmed appointments can be completed')

    // Can only be completed AFTER the scheduled session end (date+time+duration).
    // Bypassed in mock mode so future-dated test bookings remain testable.
    if (!MOCK_PAYMENTS) {
      const dateStr = appt.confirmed_date || appt.requested_date
      const timeStr = appt.confirmed_time || appt.requested_time
      const endMs =
        new Date(`${dateStr}T${timeStr}`).getTime() + (appt.duration_minutes || 60) * 60000
      if (Date.now() < endMs) {
        return badRequest('You can mark this session complete only after it has ended')
      }
    }

    // auto_release_at = now + platform auto_release_hours (default 72h).
    const { data: settings } = await supabaseAdmin
      .from('platform_settings')
      .select('auto_release_hours')
      .eq('id', 1)
      .maybeSingle()
    const hours = settings?.auto_release_hours ?? 72
    const autoReleaseAt = new Date(Date.now() + hours * 3600 * 1000).toISOString()
    const now = new Date().toISOString()

    const workerConfirmed = !!appt.worker_confirmed_at
    const sessionFields = {
      session_summary: body.sessionSummary,
      session_notes: body.sessionNotes,
      actual_duration_minutes: body.durationMinutes,
      session_completed_at: now,
    }

    if (workerConfirmed) {
      // Worker already confirmed → both sides done → complete + release payout.
      await supabaseAdmin
        .from('appointment_requests')
        .update({ ...sessionFields, status: 'completed' })
        .eq('id', appt.id)
      const result = await releasePayout(appt.id)
      // The user confirmed earlier and took no action here, so close the loop
      // for them: the session is done and the payment has been settled.
      await notify({
        userId: appt.patient_id,
        type: 'session_completed',
        title: 'Session completed',
        body: 'Your expert completed the session. Both sides have confirmed and the payment has been settled.',
        appointmentId: appt.id,
        link: '/my-appointments',
      })
      await notifyAdmins({
        type: 'admin_session_completed',
        title: 'Session completed',
        body: 'Both sides confirmed a session. Payout release was attempted.',
        appointmentId: appt.id,
        link: '/admin',
      })
      return ok({ status: 'completed', bothConfirmed: true, payout: result })
    }

    // Expert confirmed first → wait for the worker (72h auto-release armed).
    await supabaseAdmin
      .from('appointment_requests')
      .update({ ...sessionFields, status: 'awaiting_confirmation', auto_release_at: autoReleaseAt })
      .eq('id', appt.id)

    await notify({
      userId: appt.patient_id,
      type: 'session_completion_request',
      title: 'Confirm your session',
      body: 'Your expert marked the session complete. Please confirm, or report an issue within 72 hours.',
      appointmentId: appt.id,
      link: '/my-appointments',
    })

    return ok({ status: 'awaiting_confirmation', bothConfirmed: false, autoReleaseAt })
  } catch (err: any) {
    console.error('complete-session error:', err)
    return serverError('Failed to complete session', err.message)
  }
}
