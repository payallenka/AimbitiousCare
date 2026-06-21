// Diagnostic endpoint — reports which env vars the serverless runtime can see
// (booleans only, never values). Imports nothing, so it can't crash at load.
export default function handler(_req: any, res: any) {
  res.status(200).json({
    ok: true,
    env: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      VITE_SUPER_ADMIN_EMAILS: !!process.env.VITE_SUPER_ADMIN_EMAILS,
      APP_URL: !!process.env.APP_URL,
    },
    node: process.version,
  })
}
