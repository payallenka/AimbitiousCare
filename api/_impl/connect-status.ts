import { stripe, MOCK_PAYMENTS } from './_shared/stripe.js'
import { supabaseAdmin } from './_shared/supabaseAdmin.js'
import { getCallingUser } from './_shared/domain.js'
import { ok, badRequest, serverError, preflight } from './_shared/http.js'

// Retrieves the live Stripe account state for the calling expert and syncs
// charges_enabled / payouts_enabled / onboarding_completed into the DB.
// Called after the expert returns from Stripe's hosted onboarding.
export const handler: any = async (event: any) => {
  const pre = preflight(event)
  if (pre) return pre
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return badRequest('Method not allowed')
  }

  try {
    const caller = await getCallingUser(event.headers.authorization)
    if (!caller) return badRequest('Not authenticated')

    const { data: profile } = await supabaseAdmin
      .from('professional_profiles')
      .select('stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_onboarding_completed')
      .eq('user_id', caller.userId)
      .maybeSingle()

    if (!profile?.stripe_account_id) {
      return ok({ connected: false, charges_enabled: false, payouts_enabled: false })
    }

    // MOCK: report the DB flags (set instantly by connect-onboard).
    if (MOCK_PAYMENTS) {
      return ok({
        connected: true,
        charges_enabled: !!profile.stripe_charges_enabled,
        payouts_enabled: !!profile.stripe_payouts_enabled,
        onboarding_completed: !!profile.stripe_onboarding_completed,
        requirements_due: [],
      })
    }

    const account = await stripe.accounts.retrieve(profile.stripe_account_id)
    const onboardingCompleted = account.details_submitted === true

    await supabaseAdmin
      .from('professional_profiles')
      .update({
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
        stripe_onboarding_completed: onboardingCompleted,
      })
      .eq('user_id', caller.userId)

    return ok({
      connected: true,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      onboarding_completed: onboardingCompleted,
      requirements_due: account.requirements?.currently_due ?? [],
    })
  } catch (err: any) {
    console.error('connect-status error:', err)
    return serverError('Failed to fetch account status', err.message)
  }
}
