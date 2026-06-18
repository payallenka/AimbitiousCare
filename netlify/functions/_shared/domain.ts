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

// Resolve the auth user from a Bearer token. Tries the supabase-js admin client
// first; if that fails (its getUser(jwt) can throw "Auth session missing!"),
// falls back to validating the token directly against GoTrue's /user endpoint.
const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SB_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

async function resolveAuthUser(
  authHeader: string | undefined,
): Promise<{ id: string; email: string } | null> {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  // Primary: supabase-js admin client (this is what worked originally).
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (!error && data?.user) {
      return { id: data.user.id, email: (data.user.email || '').toLowerCase() }
    }
  } catch {
    /* fall through to direct validation */
  }

  // Fallback: validate against GoTrue directly (needs the anon apikey).
  try {
    if (!SB_URL || !SB_ANON_KEY) return null
    const res = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_ANON_KEY, Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const user: any = await res.json()
    if (!user?.id) return null
    return { id: user.id, email: (user.email || '').toLowerCase() }
  } catch (e) {
    console.error('resolveAuthUser fallback failed:', e)
    return null
  }
}

export async function getCallingUser(
  authHeader: string | undefined,
): Promise<AuthedUser | null> {
  const authUser = await resolveAuthUser(authHeader)
  if (!authUser) return null

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, email, user_role')
    .eq('auth_id', authUser.id)
    .maybeSingle()
  if (!profile) return null

  return {
    authId: authUser.id,
    userId: profile.id,
    email: profile.email,
    role: profile.user_role,
  }
}

export interface AdminCaller {
  authId: string
  email: string
  userId: string | null // null if the admin has no profile row (allowlist-only)
}

// Resolve an admin caller from their token. Admins are authorised by role
// ('admin' on their profile) OR by the SUPER_ADMIN_EMAILS allowlist — the
// latter works even when the account has no public.users profile row.
export async function getAdminCaller(authHeader: string | undefined): Promise<AdminCaller | null> {
  const authUser = await resolveAuthUser(authHeader)
  if (!authUser) return null

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, user_role')
    .eq('auth_id', authUser.id)
    .maybeSingle()

  const allowlist = (process.env.SUPER_ADMIN_EMAILS || process.env.VITE_SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  const isAdmin = profile?.user_role === 'admin' || (!!authUser.email && allowlist.includes(authUser.email))
  if (!isAdmin) return null

  return { authId: authUser.id, email: authUser.email, userId: profile?.id ?? null }
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
