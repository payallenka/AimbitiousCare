import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''

if (!STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY not set — running in MOCK mode; Stripe calls are simulated')
}

// Single shared Stripe client. Pin the API version for predictable behaviour.
// When no key is set we pass a harmless placeholder so the constructor doesn't
// throw at import time — in mock mode the client is never actually called.
export const stripe = new Stripe(STRIPE_SECRET_KEY || 'sk_test_placeholder_mock_mode', {
  apiVersion: '2025-02-24.acacia',
  appInfo: { name: 'AmbitiousCare', version: '1.0.0' },
})

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

// Mock mode: simulate the whole payment lifecycle without calling Stripe.
// Auto-on when there is no secret key (so it works before creds are added)
// and auto-off the moment a real key is configured. Force with MOCK_PAYMENTS.
export const MOCK_PAYMENTS =
  process.env.MOCK_PAYMENTS === 'true' || !STRIPE_SECRET_KEY

if (MOCK_PAYMENTS) {
  console.log('🧪 MOCK_PAYMENTS active — Stripe calls are simulated')
}
