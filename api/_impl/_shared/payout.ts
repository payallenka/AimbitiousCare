import { stripe, MOCK_PAYMENTS } from './stripe.js'
import { supabaseAdmin } from './supabaseAdmin.js'
import { notify, notifyAdmins } from './notify.js'

export interface PayoutResult {
  released: boolean
  reason?: string
  transferId?: string
}

// Checks all 7 automatic-payout conditions and, if satisfied, creates the
// Stripe transfer to the expert's connected account (separate charges &
// transfers, drawn from the original charge via source_transaction).
// Idempotent and safe to call repeatedly (cron + manual confirm).
export async function releasePayout(appointmentId: string): Promise<PayoutResult> {
  const { data: appt } = await supabaseAdmin
    .from('appointment_requests')
    .select('*')
    .eq('id', appointmentId)
    .maybeSingle()
  if (!appt) return { released: false, reason: 'not_found' }

  // Already done.
  if (appt.payment_status === 'released') {
    return { released: true, transferId: appt.stripe_transfer_id }
  }

  // Condition 7: payment present & held.
  if (!['paid_held', 'ready_for_release'].includes(appt.payment_status)) {
    return { released: false, reason: `payment_status=${appt.payment_status}` }
  }
  // Condition 1: completed.
  if (appt.status !== 'completed') {
    return { released: false, reason: `status=${appt.status}` }
  }
  // Condition 2: expert uploaded summary + notes + duration.
  if (!appt.session_summary || !appt.session_notes || !appt.actual_duration_minutes) {
    return { released: false, reason: 'missing_session_summary' }
  }
  // Condition 3: worker confirmed OR auto-release window elapsed.
  const autoReleaseDue =
    appt.auto_release_at && new Date(appt.auto_release_at).getTime() <= Date.now()
  if (!appt.worker_confirmed_at && !autoReleaseDue) {
    return { released: false, reason: 'awaiting_worker_or_window' }
  }
  // Conditions 4 & 5: no open dispute or safety concern.
  const { data: openCases } = await supabaseAdmin
    .from('disputes')
    .select('id')
    .eq('appointment_id', appointmentId)
    .in('status', ['open', 'under_review'])
  if (openCases && openCases.length > 0) {
    return { released: false, reason: 'open_dispute' }
  }

  // Condition 6: expert connected account ready.
  const { data: profile } = await supabaseAdmin
    .from('professional_profiles')
    .select('stripe_account_id, stripe_payouts_enabled')
    .eq('user_id', appt.professional_id)
    .maybeSingle()
  if (!MOCK_PAYMENTS && (!profile?.stripe_account_id || !profile.stripe_payouts_enabled)) {
    await supabaseAdmin
      .from('appointment_requests')
      .update({ payment_status: 'payout_failed', payout_failure_reason: 'expert_stripe_not_ready' })
      .eq('id', appointmentId)
    await notify({
      userId: appt.professional_id,
      type: 'payout_failed',
      title: 'Connect your Stripe account',
      body: 'Please connect your Stripe account to receive payment for a completed session.',
      appointmentId,
    })
    return { released: false, reason: 'expert_stripe_not_ready' }
  }

  if (!appt.stripe_charge_id) {
    return { released: false, reason: 'missing_charge' }
  }

  // MOCK: simulate the transfer without calling Stripe.
  if (MOCK_PAYMENTS) {
    await supabaseAdmin
      .from('appointment_requests')
      .update({
        payment_status: 'released',
        stripe_transfer_id: `mock_tr_${appointmentId}`,
        payout_released_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
    await notify({
      userId: appt.professional_id,
      type: 'payout_released',
      title: 'Payout released',
      body: `£${(appt.expert_payout_pence / 100).toFixed(2)} is on its way to your bank account.`,
      appointmentId,
    })
    return { released: true, transferId: `mock_tr_${appointmentId}` }
  }

  // Real path requires a connected account (mock returned above).
  if (!profile?.stripe_account_id) {
    return { released: false, reason: 'expert_stripe_not_ready' }
  }

  // Mark intent-to-release before the transfer to narrow double-pay windows.
  await supabaseAdmin
    .from('appointment_requests')
    .update({ payment_status: 'ready_for_release' })
    .eq('id', appointmentId)
    .eq('payment_status', 'paid_held')

  try {
    const transfer = await stripe.transfers.create(
      {
        amount: appt.expert_payout_pence,
        currency: appt.currency || 'gbp',
        destination: profile.stripe_account_id,
        source_transaction: appt.stripe_charge_id,
        metadata: { appointment_id: appointmentId },
      },
      { idempotencyKey: `transfer_${appointmentId}` },
    )

    await supabaseAdmin
      .from('appointment_requests')
      .update({
        payment_status: 'released',
        stripe_transfer_id: transfer.id,
        payout_released_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)

    await notify({
      userId: appt.professional_id,
      type: 'payout_released',
      title: 'Payout released',
      body: `£${(appt.expert_payout_pence / 100).toFixed(2)} is on its way to your bank account.`,
      appointmentId,
    })
    return { released: true, transferId: transfer.id }
  } catch (err: any) {
    console.error('transfer failed:', err)
    await supabaseAdmin
      .from('appointment_requests')
      .update({ payment_status: 'payout_failed', payout_failure_reason: err.message?.slice(0, 500) })
      .eq('id', appointmentId)
    await notify({
      userId: appt.professional_id,
      type: 'payout_failed',
      title: 'Payout failed',
      body: 'We could not transfer your payout. Please check your Stripe account; we will retry.',
      appointmentId,
    })
    await notifyAdmins({
      type: 'failed_payout',
      title: 'Failed payout',
      body: `Transfer failed for appointment ${appointmentId}: ${err.message}`,
      appointmentId,
    })
    return { released: false, reason: 'transfer_failed' }
  }
}

// Refunds a held payment (full or partial). The webhook finalises the
// payment_status to refunded/partially_refunded after Stripe confirms.
export async function refundAppointment(
  appointmentId: string,
  opts: { amountPence?: number; reason?: string } = {},
): Promise<{ ok: boolean; reason?: string; refundId?: string }> {
  const { data: appt } = await supabaseAdmin
    .from('appointment_requests')
    .select('id, patient_id, stripe_payment_intent_id, payment_status, amount_pence')
    .eq('id', appointmentId)
    .maybeSingle()
  if (!appt) return { ok: false, reason: 'not_found' }
  if (!appt.stripe_payment_intent_id) return { ok: false, reason: 'no_payment' }
  if (['refunded', 'released'].includes(appt.payment_status)) {
    return { ok: false, reason: `cannot_refund_${appt.payment_status}` }
  }

  // MOCK: skip Stripe. No webhook fires, so set the final refunded state now.
  if (MOCK_PAYMENTS) {
    const partial = opts.amountPence && opts.amountPence < appt.amount_pence
    await supabaseAdmin
      .from('appointment_requests')
      .update({
        payment_status: partial ? 'partially_refunded' : 'refunded',
        stripe_refund_id: `mock_re_${appointmentId}`,
      })
      .eq('id', appointmentId)
    await notify({
      userId: appt.patient_id,
      type: 'refund_completed',
      title: 'Refund completed',
      body: `A refund of £${((opts.amountPence ?? appt.amount_pence) / 100).toFixed(2)} has been processed.`,
      appointmentId,
    })
    return { ok: true, refundId: `mock_re_${appointmentId}` }
  }

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: appt.stripe_payment_intent_id,
        ...(opts.amountPence ? { amount: opts.amountPence } : {}),
        metadata: { appointment_id: appointmentId, reason: opts.reason || 'unspecified' },
      },
      { idempotencyKey: `refund_${appointmentId}_${opts.amountPence ?? 'full'}` },
    )

    await supabaseAdmin
      .from('appointment_requests')
      .update({ payment_status: 'refund_initiated', stripe_refund_id: refund.id })
      .eq('id', appointmentId)

    await notify({
      userId: appt.patient_id,
      type: 'refund_initiated',
      title: 'Refund initiated',
      body: `A refund of £${((opts.amountPence ?? appt.amount_pence) / 100).toFixed(2)} has been initiated and will appear on your statement shortly.`,
      appointmentId,
    })
    return { ok: true, refundId: refund.id }
  } catch (err: any) {
    console.error('refund failed:', err)
    return { ok: false, reason: err.message }
  }
}
