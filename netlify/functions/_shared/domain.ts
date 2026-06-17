import { supabaseAdmin } from './supabaseAdmin'

// ---- Commission math (all amounts in integer pence) ----
export interface CommissionSplit {
  amountPence: number
  commissionPence: number
  expertPayoutPence: number
  ratePercent: number
}

export function computeSplit(amountPence: number, ratePercent: number): CommissionSplit {
  const commissionPence = Math.round((amountPence * ratePercent) / 100)
  return {
    amountPence,
    commissionPence,
    expertPayoutPence: amountPence - commissionPence,
    ratePercent,
  }
}

export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100)
}

// Resolve the effective commission rate for an expert (per-expert override
// falls back to the platform default).
export async function getCommissionRate(professionalUserId: string): Promise<number> {
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabaseAdmin
      .from('professional_profiles')
      .select('commission_rate')
      .eq('user_id', professionalUserId)
      .maybeSingle(),
    supabaseAdmin.from('platform_settings').select('default_commission_rate').eq('id', 1).maybeSingle(),
  ])
  const override = profile?.commission_rate
  if (override !== null && override !== undefined) return Number(override)
  return Number(settings?.default_commission_rate ?? 15)
}

// ---- Auth: resolve the calling user from their Supabase access token ----
export interface AuthedUser {
  authId: string
  userId: string
  email: string
  role: string
}

export async function getCallingUser(
  authHeader: string | undefined,
): Promise<AuthedUser | null> {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const { data: authData, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !authData?.user) return null

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, email, user_role')
    .eq('auth_id', authData.user.id)
    .maybeSingle()
  if (!profile) return null

  return {
    authId: authData.user.id,
    userId: profile.id,
    email: profile.email,
    role: profile.user_role,
  }
}

// Load an appointment with the joined professional Stripe account info.
export async function loadAppointment(appointmentId: string) {
  const { data, error } = await supabaseAdmin
    .from('appointment_requests')
    .select('*')
    .eq('id', appointmentId)
    .maybeSingle()
  if (error) throw error
  return data
}
