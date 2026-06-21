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

// Use placeholders when env is missing so createClient doesn't THROW at module
// load (which would crash the whole serverless function with
// FUNCTION_INVOCATION_FAILED). If env is truly missing, calls fail at runtime
// with a catchable error instead.
export const supabaseAdmin = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SERVICE_ROLE_KEY || 'placeholder-key',
  { auth: { autoRefreshToken: false, persistSession: false } },
)
