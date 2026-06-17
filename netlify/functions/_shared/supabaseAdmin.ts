import { createClient } from '@supabase/supabase-js'

// Service-role client for Netlify Functions ONLY. Bypasses RLS so the
// payment/payout state machine can write authoritative records.
// NEVER import this into client-side code.
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Supabase service-role env vars missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
}

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
