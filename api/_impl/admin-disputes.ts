import { supabaseAdmin } from './_shared/supabaseAdmin.js'
import { getAdminCaller } from './_shared/domain.js'
import { ok, badRequest, serverError, preflight } from './_shared/http.js'

// Returns all disputes/safety cases with appointment + participant context for
// the admin dashboard. Service-role read bypasses RLS; gated to admins
// (role=admin or the SUPER_ADMIN_EMAILS allowlist).
export const handler: any = async (event) => {
  const pre = preflight(event)
  if (pre) return pre

  try {
    const caller = await getAdminCaller(event.headers.authorization)
    if (!caller) return badRequest('Admin only')

    const { data: disputes } = await supabaseAdmin
      .from('disputes')
      .select('*')
      .order('created_at', { ascending: false })

    if (!disputes || disputes.length === 0) return ok({ disputes: [] })

    const apptIds = [...new Set(disputes.map((d) => d.appointment_id))]
    const { data: appts } = await supabaseAdmin
      .from('appointment_requests')
      .select(
        'id, patient_id, professional_id, requested_date, requested_time, amount_pence, commission_pence, expert_payout_pence, payment_status, status, session_type',
      )
      .in('id', apptIds)

    const userIds = [
      ...new Set([
        ...(appts || []).flatMap((a) => [a.patient_id, a.professional_id]),
        ...disputes.map((d) => d.raised_by).filter(Boolean),
      ]),
    ]
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email')
      .in('id', userIds)

    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]))
    const apptMap = Object.fromEntries((appts || []).map((a) => [a.id, a]))

    const enriched = disputes.map((d) => {
      const appt = apptMap[d.appointment_id]
      return {
        ...d,
        appointment: appt
          ? {
              ...appt,
              patient: userMap[appt.patient_id] || null,
              professional: userMap[appt.professional_id] || null,
            }
          : null,
        raised_by_user: d.raised_by ? userMap[d.raised_by] || null : null,
      }
    })

    return ok({ disputes: enriched })
  } catch (err: any) {
    console.error('admin-disputes error:', err)
    return serverError('Failed to load disputes', err.message)
  }
}
