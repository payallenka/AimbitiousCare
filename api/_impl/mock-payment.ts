import { MOCK_PAYMENTS } from './_shared/stripe.js'
import { supabaseAdmin } from './_shared/supabaseAdmin.js'
import { getCallingUser } from './_shared/domain.js'
import { notify } from './_shared/notify.js'
import { ok, badRequest, serverError, preflight } from './_shared/http.js'

interface Body {
  appointmentId: string
  outcome: 'success' | 'fail'
}

// Test-only endpoint that stands in for Stripe Checkout + the webhook. On
// 'success' it marks the booking paid_held (exactly like the webhook would);
// on 'fail' it cancels the draft. Only active while MOCK_PAYMENTS is on.
export const handler: any = async (event) => {
  const pre = preflight(event)
  if (pre) return pre
  if (event.httpMethod !== 'POST') return badRequest('Method not allowed')
  if (!MOCK_PAYMENTS) return badRequest('Mock payments are disabled')

  try {
    const caller = await getCallingUser(event.headers.authorization)
    if (!caller) return badRequest('Not authenticated')

    const body: Body = JSON.parse(event.body || '{}')
    if (!body.appointmentId || !body.outcome) return badRequest('Missing appointmentId/outcome')

    const { data: appt } = await supabaseAdmin
      .from('appointment_requests')
      .select('id, patient_id, professional_id, payment_status')
      .eq('id', body.appointmentId)
      .maybeSingle()
    if (!appt) return badRequest('Appointment not found')
    if (appt.patient_id !== caller.userId) return badRequest('Not your appointment')
    if (appt.payment_status !== 'unpaid') return ok({ alreadyProcessed: true })

    if (body.outcome === 'fail') {
      await supabaseAdmin
        .from('appointment_requests')
        .update({ status: 'cancelled' })
        .eq('id', appt.id)
      return ok({ outcome: 'fail', status: 'cancelled' })
    }

    // SUCCESS — mirror the webhook's handleCheckoutCompleted.
    await supabaseAdmin
      .from('appointment_requests')
      .update({
        payment_status: 'paid_held',
        stripe_payment_intent_id: `mock_pi_${appt.id}`,
        stripe_charge_id: `mock_ch_${appt.id}`,
        paid_at: new Date().toISOString(),
      })
      .eq('id', appt.id)

    await notify({
      userId: appt.patient_id,
      type: 'payment_successful',
      title: 'Payment successful',
      body: 'Your appointment request has been submitted and payment is held securely until your session.',
      appointmentId: appt.id,
      link: '/my-appointments',
    })
    await notify({
      userId: appt.professional_id,
      type: 'new_booking_request',
      title: 'New appointment request',
      body: 'You have received a new paid appointment request awaiting your approval.',
      appointmentId: appt.id,
      link: '/appointment-inbox',
    })

    return ok({ outcome: 'success', status: 'paid_held' })
  } catch (err: any) {
    console.error('mock-payment error:', err)
    return serverError('Mock payment failed', err.message)
  }
}
