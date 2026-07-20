import { Handler } from '@netlify/functions'
import { supabaseAdmin } from './_shared/supabaseAdmin'
import { getCallingUser } from './_shared/domain'
import { notify, notifyAdmins } from './_shared/notify'
import { ok, badRequest, serverError, preflight } from './_shared/http'

interface Body {
  appointmentId: string
  category?: 'standard' | 'safety'
  reason: string
  details?: string
}

// Raises a dispute or an emergency safety concern. Either participant may
// raise it. The appointment moves to 'disputed' (standard) or
// 'under_investigation' (safety) and payout is blocked until an admin
// resolves the case (enforced in releasePayout's open-case check).
export const handler: Handler = async (event) => {
  const pre = preflight(event)
  if (pre) return pre
  if (event.httpMethod !== 'POST') return badRequest('Method not allowed')

  try {
    const caller = await getCallingUser(event.headers.authorization)
    if (!caller) return badRequest('Not authenticated')

    const body: Body = JSON.parse(event.body || '{}')
    if (!body.appointmentId || !body.reason) return badRequest('Missing appointmentId/reason')
    const category = body.category === 'safety' ? 'safety' : 'standard'

    const { data: appt } = await supabaseAdmin
      .from('appointment_requests')
      .select('id, patient_id, professional_id, payment_status')
      .eq('id', body.appointmentId)
      .maybeSingle()
    if (!appt) return badRequest('Appointment not found')

    const isPatient = appt.patient_id === caller.userId
    const isExpert = appt.professional_id === caller.userId
    if (!isPatient && !isExpert) return badRequest('Not a participant of this appointment')

    await supabaseAdmin.from('disputes').insert({
      appointment_id: appt.id,
      raised_by: caller.userId,
      raised_by_role: isPatient ? 'worker' : 'expert',
      category,
      reason: body.reason,
      details: body.details || null,
      status: 'open',
    })

    await supabaseAdmin
      .from('appointment_requests')
      .update({ status: category === 'safety' ? 'under_investigation' : 'disputed' })
      .eq('id', appt.id)

    // Notify the counterparty and all admins (high priority for safety).
    const counterparty = isPatient ? appt.professional_id : appt.patient_id
    await notify({
      userId: counterparty,
      type: category === 'safety' ? 'safety_concern_raised' : 'dispute_raised',
      title: category === 'safety' ? 'Safety concern raised' : 'A dispute was raised',
      body:
        category === 'safety'
          ? 'A safety concern was reported for your session and is under investigation.'
          : 'A dispute was raised for your session and is under review.',
      appointmentId: appt.id,
    })
    await notifyAdmins({
      type: category === 'safety' ? 'safety_concern_alert' : 'new_dispute',
      title: category === 'safety' ? '🚨 Safety concern alert' : 'New dispute',
      body: `${category === 'safety' ? 'SAFETY: ' : ''}${body.reason}`,
      appointmentId: appt.id,
    })
    // The person who raised it also needs written confirmation it was logged,
    // and that their payment is frozen while it is reviewed.
    await notify({
      userId: caller.userId,
      type: category === 'safety' ? 'safety_concern_submitted' : 'dispute_submitted',
      title: category === 'safety' ? 'Safety concern submitted' : 'Dispute submitted',
      body:
        category === 'safety'
          ? 'We have received your safety report and our team is investigating. The payment is frozen until it is resolved.'
          : 'We have received your dispute and our team is reviewing it. The payment is on hold until it is resolved.',
      appointmentId: appt.id,
      link: isPatient ? '/my-appointments' : '/appointment-inbox',
    })

    return ok({ status: category === 'safety' ? 'under_investigation' : 'disputed' })
  } catch (err: any) {
    console.error('raise-dispute error:', err)
    return serverError('Failed to raise case', err.message)
  }
}
