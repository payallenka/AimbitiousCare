import Stripe from 'stripe'
import { stripe, STRIPE_WEBHOOK_SECRET } from './_shared/stripe.js'
import { supabaseAdmin } from './_shared/supabaseAdmin.js'
import { notify } from './_shared/notify.js'

// Stripe webhook — the SINGLE source of truth for payment state. The client
// success redirect is never trusted; a booking only becomes "paid_held" here,
// after signature verification.
export const handler: any = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const sig = event.headers['stripe-signature']
  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    return { statusCode: 400, body: 'Missing signature / webhook secret' }
  }

  // Raw body is required for signature verification.
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : event.body || ''

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('⚠️ Webhook signature verification failed:', err.message)
    return { statusCode: 400, body: `Webhook Error: ${err.message}` }
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object as Stripe.Checkout.Session)
        break
      case 'account.updated':
        await handleAccountUpdated(stripeEvent.data.object as Stripe.Account)
        break
      case 'charge.refunded':
        await handleChargeRefunded(stripeEvent.data.object as Stripe.Charge)
        break
      case 'transfer.created':
        // Payout transfer succeeded → mark released (defensive; release-payout
        // already sets this, but webhooks make it idempotent).
        await handleTransferCreated(stripeEvent.data.object as Stripe.Transfer)
        break
      default:
        // Unhandled events are acknowledged so Stripe stops retrying.
        break
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) }
  } catch (err: any) {
    console.error(`Webhook handler error (${stripeEvent.type}):`, err)
    // Return 500 so Stripe retries transient failures.
    return { statusCode: 500, body: 'Handler error' }
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const appointmentId = session.metadata?.appointment_id
  if (!appointmentId) return
  if (session.payment_status !== 'paid') return

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id

  let chargeId: string | null = null
  if (paymentIntentId) {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null
  }

  const { data: appt } = await supabaseAdmin
    .from('appointment_requests')
    .select('id, patient_id, professional_id, payment_status, requested_date, requested_time')
    .eq('id', appointmentId)
    .maybeSingle()
  if (!appt) return
  // Idempotent: ignore if already processed.
  if (appt.payment_status !== 'unpaid') return

  await supabaseAdmin
    .from('appointment_requests')
    .update({
      payment_status: 'paid_held',
      stripe_payment_intent_id: paymentIntentId,
      stripe_charge_id: chargeId,
      paid_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)

  await notify({
    userId: appt.patient_id,
    type: 'payment_successful',
    title: 'Payment successful',
    body: 'Your appointment request has been submitted and payment is held securely until your session.',
    appointmentId,
    link: '/my-appointments',
  })
  await notify({
    userId: appt.professional_id,
    type: 'new_booking_request',
    title: 'New appointment request',
    body: 'You have received a new paid appointment request awaiting your approval.',
    appointmentId,
    link: '/appointment-inbox',
  })
}

async function handleAccountUpdated(account: Stripe.Account) {
  const userId = account.metadata?.user_id
  const query = supabaseAdmin
    .from('professional_profiles')
    .update({
      stripe_charges_enabled: account.charges_enabled,
      stripe_payouts_enabled: account.payouts_enabled,
      stripe_onboarding_completed: account.details_submitted === true,
    })
  // Prefer the metadata user_id; fall back to matching the account id.
  if (userId) {
    await query.eq('user_id', userId)
  } else {
    await query.eq('stripe_account_id', account.id)
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  if (!paymentIntentId) return

  const fullyRefunded = charge.amount_refunded >= charge.amount
  await supabaseAdmin
    .from('appointment_requests')
    .update({ payment_status: fullyRefunded ? 'refunded' : 'partially_refunded' })
    .eq('stripe_payment_intent_id', paymentIntentId)
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  const appointmentId = transfer.metadata?.appointment_id
  if (!appointmentId) return
  await supabaseAdmin
    .from('appointment_requests')
    .update({ payment_status: 'released', stripe_transfer_id: transfer.id })
    .eq('id', appointmentId)
    .eq('payment_status', 'ready_for_release')
}
