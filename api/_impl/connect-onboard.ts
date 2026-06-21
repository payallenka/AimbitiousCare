import { stripe, MOCK_PAYMENTS } from './_shared/stripe.js'
import { supabaseAdmin } from './_shared/supabaseAdmin.js'
import { getCallingUser } from './_shared/domain.js'
import { ok, badRequest, serverError, preflight } from './_shared/http.js'

const APP_URL = process.env.APP_URL || 'http://localhost:8888'

const EXPERT_ROLES = [
  'therapist',
  'relationship_expert',
  'financial_expert',
  'dating_coach',
  'health_wellness_coach',
  'executive_coach',
  'executive_mentor',
]

// Creates (or reuses) a Stripe Express connected account for the calling
// expert and returns a hosted onboarding link. Stripe collects and stores
// bank/identity/tax details — we only persist the account id.
export const handler: any = async (event: any) => {
  const pre = preflight(event)
  if (pre) return pre
  if (event.httpMethod !== 'POST') return badRequest('Method not allowed')

  try {
    const caller = await getCallingUser(event.headers.authorization)
    if (!caller) return badRequest('Not authenticated')
    if (!EXPERT_ROLES.includes(caller.role)) {
      return badRequest('Only experts can connect a payout account')
    }

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('professional_profiles')
      .select('id, stripe_account_id')
      .eq('user_id', caller.userId)
      .maybeSingle()
    if (profErr) throw profErr
    if (!profile) return badRequest('Complete your professional profile first')

    // MOCK: instantly mark the expert payout-ready without real onboarding.
    if (MOCK_PAYMENTS) {
      await supabaseAdmin
        .from('professional_profiles')
        .update({
          stripe_account_id: profile.stripe_account_id || `mock_acct_${caller.userId}`,
          stripe_charges_enabled: true,
          stripe_payouts_enabled: true,
          stripe_onboarding_completed: true,
        })
        .eq('user_id', caller.userId)
      return ok({ url: `/availability?stripe=return`, accountId: `mock_acct_${caller.userId}`, mock: true })
    }

    let accountId = profile.stripe_account_id

    // Create the Express account on first connect.
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: caller.email,
        business_type: 'individual',
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { user_id: caller.userId },
      })
      accountId = account.id
      await supabaseAdmin
        .from('professional_profiles')
        .update({ stripe_account_id: accountId })
        .eq('user_id', caller.userId)
    }

    // Account onboarding link (one-time use, short-lived).
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/availability?stripe=refresh`,
      return_url: `${APP_URL}/availability?stripe=return`,
      type: 'account_onboarding',
    })

    return ok({ url: accountLink.url, accountId })
  } catch (err: any) {
    console.error('connect-onboard error:', err)
    return serverError('Failed to start onboarding', err.message)
  }
}
