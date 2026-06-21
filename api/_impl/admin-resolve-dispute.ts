import { stripe, MOCK_PAYMENTS } from './_shared/stripe.js'
import { supabaseAdmin } from './_shared/supabaseAdmin.js'
import { getAdminCaller } from './_shared/domain.js'
import { refundAppointment } from './_shared/payout.js'
import { notify } from './_shared/notify.js'
import { ok, badRequest, serverError, preflight } from './_shared/http.js'

interface Body {
  disputeId: string
  resolution: 'full_refund' | 'partial_refund' | 'expert_wins' | 'dismissed'
  workerRefundPence?: number // required for partial_refund
  adminNotes?: string
}

// Resolves a dispute/safety case. Authority override: can move money even when
// the automatic-payout conditions are not all met. Admin-only.
export const handler: any = async (event: any) => {
  const pre = preflight(event)
  if (pre) return pre
  if (event.httpMethod !== 'POST') return badRequest('Method not allowed')

  try {
    const caller = await getAdminCaller(event.headers.authorization)
    if (!caller) return badRequest('Admin only')

    const body: Body = JSON.parse(event.body || '{}')
    if (!body.disputeId || !body.resolution) return badRequest('Missing disputeId/resolution')

    const { data: dispute } = await supabaseAdmin
      .from('disputes')
      .select('*')
      .eq('id', body.disputeId)
      .maybeSingle()
    if (!dispute) return badRequest('Dispute not found')
    if (['resolved', 'rejected'].includes(dispute.status)) {
      return badRequest('Dispute already resolved')
    }

    const { data: appt } = await supabaseAdmin
      .from('appointment_requests')
      .select('*')
      .eq('id', dispute.appointment_id)
      .maybeSingle()
    if (!appt) return badRequest('Appointment not found')

    let workerRefundPence = 0
    let expertPayoutPence = 0
    let apptStatus = appt.status
    let resolutionType = body.resolution

    if (body.resolution === 'full_refund') {
      workerRefundPence = appt.amount_pence
      await refundAppointment(appt.id, { reason: 'dispute_full_refund' })
      apptStatus = 'cancelled'
    } else if (body.resolution === 'partial_refund') {
      if (!body.workerRefundPence || body.workerRefundPence <= 0) {
        return badRequest('workerRefundPence required for partial refund')
      }
      workerRefundPence = Math.min(body.workerRefundPence, appt.amount_pence)
      // Expert receives the remainder less platform commission.
      expertPayoutPence = Math.max(0, appt.amount_pence - workerRefundPence - appt.commission_pence)
      await refundAppointment(appt.id, { amountPence: workerRefundPence, reason: 'dispute_partial_refund' })
      if (expertPayoutPence > 0 && appt.stripe_charge_id) {
        await transferToExpert(appt, expertPayoutPence)
      }
      apptStatus = 'completed'
    } else if (body.resolution === 'expert_wins') {
      expertPayoutPence = appt.expert_payout_pence
      if (appt.stripe_charge_id) await transferToExpert(appt, expertPayoutPence)
      apptStatus = 'completed'
    } else if (body.resolution === 'dismissed') {
      // No money moves; appointment returns to its prior settled state.
      resolutionType = 'dismissed'
    }

    await supabaseAdmin
      .from('disputes')
      .update({
        status: body.resolution === 'dismissed' ? 'rejected' : 'resolved',
        resolution_type: resolutionType,
        worker_refund_pence: workerRefundPence || null,
        expert_payout_pence: expertPayoutPence || null,
        admin_notes: body.adminNotes || null,
        resolved_by: caller?.userId ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', dispute.id)

    if (apptStatus !== appt.status) {
      await supabaseAdmin.from('appointment_requests').update({ status: apptStatus }).eq('id', appt.id)
    }

    await notify({
      userId: appt.patient_id,
      type: 'dispute_resolved',
      title: 'Dispute resolved',
      body: `The case for your appointment has been resolved (${resolutionType.replace('_', ' ')}).`,
      appointmentId: appt.id,
    })
    await notify({
      userId: appt.professional_id,
      type: 'dispute_resolved',
      title: 'Dispute resolved',
      body: `The case for your appointment has been resolved (${resolutionType.replace('_', ' ')}).`,
      appointmentId: appt.id,
    })

    return ok({ resolved: true, workerRefundPence, expertPayoutPence })
  } catch (err: any) {
    console.error('admin-resolve-dispute error:', err)
    return serverError('Failed to resolve dispute', err.message)
  }
}

async function transferToExpert(appt: any, amountPence: number) {
  let transferId = `mock_tr_${appt.id}`

  if (!MOCK_PAYMENTS) {
    const { data: profile } = await supabaseAdmin
      .from('professional_profiles')
      .select('stripe_account_id, stripe_payouts_enabled')
      .eq('user_id', appt.professional_id)
      .maybeSingle()
    if (!profile?.stripe_account_id || !profile.stripe_payouts_enabled) {
      await supabaseAdmin
        .from('appointment_requests')
        .update({ payment_status: 'payout_failed', payout_failure_reason: 'expert_stripe_not_ready' })
        .eq('id', appt.id)
      return
    }
    const transfer = await stripe.transfers.create(
      {
        amount: amountPence,
        currency: appt.currency || 'gbp',
        destination: profile.stripe_account_id,
        source_transaction: appt.stripe_charge_id,
        metadata: { appointment_id: appt.id, source: 'dispute_resolution' },
      },
      { idempotencyKey: `dispute_transfer_${appt.id}` },
    )
    transferId = transfer.id
  }

  await supabaseAdmin
    .from('appointment_requests')
    .update({
      payment_status: 'released',
      stripe_transfer_id: transferId,
      payout_released_at: new Date().toISOString(),
    })
    .eq('id', appt.id)
  await notify({
    userId: appt.professional_id,
    type: 'payout_released',
    title: 'Payout released',
    body: `£${(amountPence / 100).toFixed(2)} has been released to your account.`,
    appointmentId: appt.id,
  })
}
