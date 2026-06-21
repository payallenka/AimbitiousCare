import { stripe, MOCK_PAYMENTS } from './_shared/stripe.js'
import { supabaseAdmin } from './_shared/supabaseAdmin.js'
import { getCallingUser, getCommissionRate, computeSplit, poundsToPence } from './_shared/domain.js'
import { ok, badRequest, serverError, preflight } from './_shared/http.js'

const APP_URL = process.env.APP_URL || 'http://localhost:8888'

interface CheckoutBody {
  professionalId: string
  requestedDate: string
  requestedTime: string
  sessionType: 'online' | 'offline'
  onlinePlatform?: 'google_meet' | 'zoom'
  message?: string
  concerns?: string
  goals?: string
  consent: boolean
}

// Creates an appointment draft, then a Stripe Checkout Session. Funds are
// charged into the PLATFORM balance and held (separate charges & transfers) —
// no transfer_data is set, so nothing reaches the expert until conditions are
// met. The appointment row is created BEFORE payment so a successful charge
// can never be orphaned.
export const handler: any = async (event: any) => {
  const pre = preflight(event)
  if (pre) return pre
  if (event.httpMethod !== 'POST') return badRequest('Method not allowed')

  try {
    const caller = await getCallingUser(event.headers.authorization)
    if (!caller) return badRequest('Not authenticated')
    if (caller.role !== 'patient') return badRequest('Only patients can book appointments')

    const body: CheckoutBody = JSON.parse(event.body || '{}')
    const { professionalId, requestedDate, requestedTime, sessionType } = body

    if (!professionalId || !requestedDate || !requestedTime || !sessionType) {
      return badRequest('Missing required booking fields')
    }
    if (!body.consent) return badRequest('Consent is required to book')
    if (sessionType === 'online' && !body.onlinePlatform) {
      return badRequest('Select a platform for online sessions')
    }

    // Load expert + payout readiness + fee.
    const { data: expert } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email')
      .eq('id', professionalId)
      .maybeSingle()
    if (!expert) return badRequest('Expert not found')

    const { data: profile } = await supabaseAdmin
      .from('professional_profiles')
      .select('appointment_fee, session_duration, stripe_account_id, stripe_payouts_enabled')
      .eq('user_id', professionalId)
      .maybeSingle()

    if (!profile?.appointment_fee || profile.appointment_fee <= 0) {
      return badRequest('This expert has not set a session fee')
    }
    // In mock mode the payout-readiness gate is relaxed so flows can be tested
    // without real Stripe onboarding.
    if (!MOCK_PAYMENTS && (!profile.stripe_account_id || !profile.stripe_payouts_enabled)) {
      return badRequest('This expert is not yet set up to receive payments')
    }

    const currency = 'gbp'
    const amountPence = poundsToPence(Number(profile.appointment_fee))
    const ratePercent = await getCommissionRate(professionalId)
    const split = computeSplit(amountPence, ratePercent)
    const durationMinutes = profile.session_duration || 60

    // 1) Create the appointment draft (unpaid / pending approval).
    const { data: appt, error: insErr } = await supabaseAdmin
      .from('appointment_requests')
      .insert({
        patient_id: caller.userId,
        professional_id: professionalId,
        requested_date: requestedDate,
        requested_time: requestedTime,
        duration_minutes: durationMinutes,
        status: 'pending',
        payment_status: 'unpaid',
        session_type: sessionType,
        online_platform: sessionType === 'online' ? body.onlinePlatform : null,
        patient_message: body.message || null,
        patient_concerns: body.concerns || null,
        patient_goals: body.goals || null,
        patient_email: caller.email,
        patient_consent_given: true,
        currency,
        amount_pence: amountPence,
        commission_pence: split.commissionPence,
        expert_payout_pence: split.expertPayoutPence,
        commission_rate_applied: ratePercent,
      })
      .select('id')
      .single()
    if (insErr) throw insErr

    // 2a) MOCK: skip Stripe; send the user to the in-app mock payment page.
    if (MOCK_PAYMENTS) {
      return ok({ url: `/mock-payment?appt=${appt.id}`, appointmentId: appt.id, mock: true })
    }

    // 2b) Checkout Session — platform charge, funds held. Idempotency keyed on
    //    the appointment id prevents duplicate charges on double-click/retry.
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: caller.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: amountPence,
              product_data: {
                name: `Session with ${expert.full_name}`,
                description: `${durationMinutes} min ${sessionType} session on ${requestedDate} ${requestedTime}`,
              },
            },
          },
        ],
        payment_intent_data: {
          metadata: { appointment_id: appt.id, patient_id: caller.userId, professional_id: professionalId },
        },
        metadata: { appointment_id: appt.id },
        success_url: `${APP_URL}/my-appointments?payment=success&appt=${appt.id}`,
        cancel_url: `${APP_URL}/book-appointment?payment=cancelled&appt=${appt.id}`,
      },
      { idempotencyKey: `checkout_${appt.id}` },
    )

    await supabaseAdmin
      .from('appointment_requests')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', appt.id)

    return ok({ url: session.url, appointmentId: appt.id })
  } catch (err: any) {
    console.error('create-checkout error:', err)
    return serverError('Failed to start checkout', err.message)
  }
}
