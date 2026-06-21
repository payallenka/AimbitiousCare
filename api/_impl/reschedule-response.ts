import { supabaseAdmin } from './_shared/supabaseAdmin.js'
import { getCallingUser } from './_shared/domain.js'
import { refundAppointment } from './_shared/payout.js'
import { notify } from './_shared/notify.js'
import { ok, badRequest, serverError, preflight } from './_shared/http.js'

interface Body {
  appointmentId: string
  action: 'accept' | 'reject'
}

// Worker responds to an expert's reschedule proposal. Accept applies the new
// slot (existing payment stays valid); reject cancels with a full refund.
export const handler: any = async (event) => {
  const pre = preflight(event)
  if (pre) return pre
  if (event.httpMethod !== 'POST') return badRequest('Method not allowed')

  try {
    const caller = await getCallingUser(event.headers.authorization)
    if (!caller) return badRequest('Not authenticated')

    const body: Body = JSON.parse(event.body || '{}')
    if (!body.appointmentId || !body.action) return badRequest('Missing appointmentId/action')

    const { data: appt } = await supabaseAdmin
      .from('appointment_requests')
      .select('*')
      .eq('id', body.appointmentId)
      .maybeSingle()
    if (!appt) return badRequest('Appointment not found')
    if (appt.patient_id !== caller.userId) return badRequest('Not your appointment')
    if (appt.status !== 'reschedule_pending') return badRequest('No pending reschedule')

    if (body.action === 'accept') {
      await supabaseAdmin
        .from('appointment_requests')
        .update({
          status: 'confirmed',
          requested_date: appt.proposed_date,
          requested_time: appt.proposed_time,
          confirmed_date: appt.proposed_date,
          confirmed_time: appt.proposed_time,
          proposed_date: null,
          proposed_time: null,
        })
        .eq('id', appt.id)
      await notify({
        userId: appt.professional_id,
        type: 'reschedule_accepted',
        title: 'Reschedule accepted',
        body: 'The worker accepted your new proposed time.',
        appointmentId: appt.id,
      })
      return ok({ status: 'confirmed' })
    }

    // Reject → cancel + full refund.
    await supabaseAdmin
      .from('appointment_requests')
      .update({ status: 'cancelled' })
      .eq('id', appt.id)
    const refund = await refundAppointment(appt.id, { reason: 'reschedule_rejected' })
    return ok({ status: 'cancelled', refund })
  } catch (err: any) {
    console.error('reschedule-response error:', err)
    return serverError('Failed to process reschedule', err.message)
  }
}
