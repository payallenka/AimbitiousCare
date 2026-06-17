import { supabaseAdmin } from './supabaseAdmin'

export interface NotifyInput {
  userId: string
  type: string
  title: string
  body?: string
  appointmentId?: string
  link?: string
}

// Insert an in-app notification. Best-effort: never throw into the caller's
// critical payment path.
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      appointment_id: input.appointmentId ?? null,
      link: input.link ?? null,
    })
  } catch (e) {
    console.error('notify() failed:', e)
  }
}

// Notify every admin. Admins are resolved by role; the SUPER_ADMIN_EMAILS
// allowlist is an optional fallback (used before any 'admin' role is set).
export async function notifyAdmins(input: Omit<NotifyInput, 'userId'>): Promise<void> {
  try {
    const recipientIds = new Set<string>()

    const { data: roleAdmins } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('user_role', 'admin')
    for (const a of roleAdmins || []) recipientIds.add(a.id)

    const emails = (process.env.SUPER_ADMIN_EMAILS || process.env.VITE_SUPER_ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    if (emails.length) {
      const { data: emailAdmins } = await supabaseAdmin.from('users').select('id').in('email', emails)
      for (const a of emailAdmins || []) recipientIds.add(a.id)
    }

    for (const id of recipientIds) {
      await notify({ ...input, userId: id })
    }
  } catch (e) {
    console.error('notifyAdmins() failed:', e)
  }
}
