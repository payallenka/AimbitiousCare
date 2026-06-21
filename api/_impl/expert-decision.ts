import { supabaseAdmin } from './_shared/supabaseAdmin.js'
import { getCallingUser } from './_shared/domain.js'
import { refundAppointment } from './_shared/payout.js'
import { notify } from './_shared/notify.js'
import { ok, badRequest, serverError, preflight } from './_shared/http.js'

interface Body {
  appointmentId: string
  decision: 'accept' | 'reject' | 'reschedule'
  meetingLink?: string
  location?: string
  proposedDate?: string
  proposedTime?: string
  reason?: string
  response?: string
}

// Expert responds to a paid booking request: accept (confirm), reject (full
// refund + cancel), or reschedule (propose a new slot; existing payment stays
// valid). Only the appointment's professional may call this.
export const handler: any = async (event: any) => {
  const pre = preflight(event)
  if (pre) return pre
  if (event.httpMethod !== 'POST') return badRequest('Method not allowed')

  try {
    const caller = await getCallingUser(event.headers.authorization)
    if (!caller) return badRequest('Not authenticated')

    const body: Body = JSON.parse(event.body || '{}')
    if (!body.appointmentId || !body.decision) return badRequest('Missing appointmentId/decision')

    const { data: appt } = await supabaseAdmin
      .from('appointment_requests')
      .select('*')
      .eq('id', body.appointmentId)
      .maybeSingle()
    if (!appt) return badRequest('Appointment not found')
    if (appt.professional_id !== caller.userId) return badRequest('Not your appointment')
    if (appt.payment_status !== 'paid_held') {
      return badRequest('Cannot act on an unpaid or already-settled appointment')
    }

    if (body.decision === 'accept') {
      if (appt.session_type === 'online' && !body.meetingLink && !appt.meeting_link) {
        // Allowed, but warn via reminder later. Accept anyway.
      }
      await supabaseAdmin
        .from('appointment_requests')
        .update({
          status: 'confirmed',
          confirmed_date: appt.requested_date,
          confirmed_time: appt.requested_time,
          // Online sessions carry a meeting link; offline sessions a location.
          meeting_link: appt.session_type === 'online' ? body.meetingLink || appt.meeting_link || null : null,
          location: appt.session_type === 'offline' ? body.location || appt.location || null : null,
          professional_response: body.response || null,
        })
        .eq('id', appt.id)

      await notify({
        userId: appt.patient_id,
        type: 'appointment_confirmed',
        title: 'Appointment confirmed',
        body: 'Your appointment has been confirmed by the expert.',
        appointmentId: appt.id,
        link: '/my-appointments',
      })
      return ok({ status: 'confirmed' })
    }

    if (body.decision === 'reject') {
      await supabaseAdmin
        .from('appointment_requests')
        .update({ status: 'cancelled', professional_response: body.response || null })
        .eq('id', appt.id)
      const refund = await refundAppointment(appt.id, { reason: 'expert_rejected' })
      await notify({
        userId: appt.patient_id,
        type: 'appointment_rejected',
        title: 'Appointment declined',
        body: 'Your appointment request was declined. A full refund has been initiated.',
        appointmentId: appt.id,
        link: '/my-appointments',
      })
      return ok({ status: 'cancelled', refund })
    }

    if (body.decision === 'reschedule') {
      if (!body.proposedDate || !body.proposedTime) {
        return badRequest('Proposed date and time are required to reschedule')
      }
      await supabaseAdmin
        .from('appointment_requests')
        .update({
          status: 'reschedule_pending',
          proposed_date: body.proposedDate,
          proposed_time: body.proposedTime,
          reschedule_reason: body.reason || null,
          reschedule_count: (appt.reschedule_count || 0) + 1,
        })
        .eq('id', appt.id)
      await notify({
        userId: appt.patient_id,
        type: 'reschedule_request',
        title: 'Reschedule requested',
        body: 'The expert proposed a new time for your appointment. Please accept or decline.',
        appointmentId: appt.id,
        link: '/my-appointments',
      })
      return ok({ status: 'reschedule_pending' })
    }

    return badRequest('Unknown decision')
  } catch (err: any) {
    console.error('expert-decision error:', err)
    return serverError('Failed to process decision', err.message)
  }
}
