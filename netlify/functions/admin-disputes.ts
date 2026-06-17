import { Handler } from '@netlify/functions'
import { supabaseAdmin } from './_shared/supabaseAdmin'
import { getCallingUser } from './_shared/domain'
import { ok, badRequest, serverError, preflight } from './_shared/http'

// Admin is decided by role; the email allowlist is an optional fallback.
function isAdmin(role: string, email: string): boolean {
  if (role === 'admin') return true
  const emails = (process.env.SUPER_ADMIN_EMAILS || process.env.VITE_SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return emails.includes(email.toLowerCase())
}

// Returns all disputes/safety cases with appointment + participant context for
// the admin dashboard. Service-role read bypasses RLS; access is gated on the
// super-admin email allowlist.
export const handler: Handler = async (event) => {
  const pre = preflight(event)
  if (pre) return pre

  try {
    const caller = await getCallingUser(event.headers.authorization)
    if (!caller) return badRequest('Not authenticated')
    if (!isAdmin(caller.role, caller.email)) return badRequest('Admin only')

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
