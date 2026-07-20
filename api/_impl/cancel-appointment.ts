import { supabaseAdmin } from './_shared/supabaseAdmin.js'
import { getCallingUser } from './_shared/domain.js'
import { refundAppointment } from './_shared/payout.js'
import { notify, notifyAdmins } from './_shared/notify.js'
import { ok, badRequest, serverError, preflight } from './_shared/http.js'

interface Body {
  appointmentId: string
}

// Worker cancels their own booking. Default cancellation policy:
//   • > 24h before the session  → full refund
//   • within 24h of the session → no refund (expert's time is reserved)
// Adjust this rule to match the final platform policy.
export const handler: any = async (event: any) => {
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
      .select('*')
      .eq('id', body.appointmentId)
      .maybeSingle()
    if (!appt) return badRequest('Appointment not found')
    if (appt.patient_id !== caller.userId) return badRequest('Not your appointment')
    if (!['pending', 'confirmed', 'reschedule_pending'].includes(appt.status)) {
      return badRequest('This appointment can no longer be cancelled')
    }

    const dateStr = appt.confirmed_date || appt.requested_date
    const timeStr = appt.confirmed_time || appt.requested_time
    const sessionTime = new Date(`${dateStr}T${timeStr}`)
    const hoursUntil = (sessionTime.getTime() - Date.now()) / 3600000
    const fullRefund = appt.status === 'pending' || hoursUntil >= 24

    await supabaseAdmin
      .from('appointment_requests')
      .update({ status: 'cancelled' })
      .eq('id', appt.id)

    let refund = null
    if (appt.payment_status === 'paid_held' && fullRefund) {
      refund = await refundAppointment(appt.id, { reason: 'worker_cancelled' })
    }

    await notify({
      userId: appt.professional_id,
      type: 'appointment_cancelled',
      title: 'Appointment cancelled',
      body: 'A worker cancelled their appointment.',
      appointmentId: appt.id,
    })
    // Confirm to the user what happened to their money, since the refund rule
    // depends on how close to the session they cancelled.
    await notify({
      userId: appt.patient_id,
      type: 'appointment_cancelled_confirmation',
      title: 'Appointment cancelled',
      body: fullRefund
        ? 'Your appointment was cancelled and a full refund has been initiated.'
        : 'Your appointment was cancelled. As it was within 24 hours of the session, no refund applies.',
      appointmentId: appt.id,
      link: '/my-appointments',
    })
    await notifyAdmins({
      type: 'admin_booking_cancelled',
      title: 'Booking cancelled by user',
      body: fullRefund
        ? 'A user cancelled their appointment. A full refund was issued.'
        : 'A user cancelled within 24h of the session — no refund was issued.',
      appointmentId: appt.id,
      link: '/admin',
    })

    return ok({ status: 'cancelled', fullRefund, refund })
  } catch (err: any) {
    console.error('cancel-appointment error:', err)
    return serverError('Failed to cancel', err.message)
  }
}
