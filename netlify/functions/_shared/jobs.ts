import { supabaseAdmin } from './supabaseAdmin'
import { releasePayout, refundAppointment } from './payout'
import { notify, notifyAdmins } from './notify'

// Time-based payment lifecycle rules. Called hourly by the platform's cron
// (Netlify scheduled function or Vercel cron). Returns a summary of actions.
export async function runScheduledJobs() {
  const now = new Date()
  const nowIso = now.toISOString()
  const summary = { autoReleased: 0, expiredRefunded: 0, summaryReminders: 0, linkReminders: 0 }

  // 1) AUTO-RELEASE: 72h elapsed with no dispute and no worker action.
  const { data: dueRelease } = await supabaseAdmin
    .from('appointment_requests')
    .select('id')
    .eq('status', 'awaiting_confirmation')
    .lte('auto_release_at', nowIso)
  for (const appt of dueRelease || []) {
    await supabaseAdmin.from('appointment_requests').update({ status: 'completed' }).eq('id', appt.id)
    const res = await releasePayout(appt.id)
    if (res.released) summary.autoReleased++
  }

  // 2) EXPERT NEVER RESPONDS: paid request past its expiry → cancel + refund.
  const { data: expired } = await supabaseAdmin
    .from('appointment_requests')
    .select('id')
    .eq('status', 'pending')
    .eq('payment_status', 'paid_held')
    .lte('request_expires_at', nowIso)
  for (const appt of expired || []) {
    await supabaseAdmin.from('appointment_requests').update({ status: 'cancelled' }).eq('id', appt.id)
    await refundAppointment(appt.id, { reason: 'expert_no_response' })
    summary.expiredRefunded++
  }

  // 3) SUMMARY REMINDER: confirmed session >48h past with no summary uploaded.
  const cutoff48 = new Date(now.getTime() - 48 * 3600 * 1000).toISOString().slice(0, 10)
  const { data: needSummary } = await supabaseAdmin
    .from('appointment_requests')
    .select('id, professional_id')
    .eq('status', 'confirmed')
    .is('session_summary', null)
    .is('summary_reminder_sent_at', null)
    .lte('confirmed_date', cutoff48)
  for (const appt of needSummary || []) {
    await notify({
      userId: appt.professional_id,
      type: 'summary_reminder',
      title: 'Upload your session summary',
      body: 'Please mark the session complete and upload your summary so payout can proceed.',
      appointmentId: appt.id,
    })
    await supabaseAdmin.from('appointment_requests').update({ summary_reminder_sent_at: nowIso }).eq('id', appt.id)
    summary.summaryReminders++
  }

  // 4) MISSING MEETING LINK: online session within 24h, no link yet.
  const next24 = new Date(now.getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10)
  const { data: needLink } = await supabaseAdmin
    .from('appointment_requests')
    .select('id, professional_id')
    .eq('status', 'confirmed')
    .eq('session_type', 'online')
    .is('meeting_link', null)
    .is('link_reminder_sent_at', null)
    .lte('confirmed_date', next24)
  for (const appt of needLink || []) {
    await notify({
      userId: appt.professional_id,
      type: 'meeting_link_missing',
      title: 'Add your meeting link',
      body: 'Your online session is approaching but has no meeting link. Please add one.',
      appointmentId: appt.id,
    })
    await notifyAdmins({
      type: 'meeting_link_missing',
      title: 'Meeting link missing',
      body: `Online appointment ${appt.id} has no meeting link within 24h.`,
      appointmentId: appt.id,
    })
    await supabaseAdmin.from('appointment_requests').update({ link_reminder_sent_at: nowIso }).eq('id', appt.id)
    summary.linkReminders++
  }

  console.log('scheduled-jobs summary:', summary)
  return summary
}
