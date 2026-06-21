import { handler } from './_impl/stripe-webhook.js'
import { toVercel } from './_impl/_shared/vercel-adapter.js'

// Stripe needs the raw, unparsed request body to verify the signature.
export const config = { api: { bodyParser: false } }

export default toVercel(handler as any, { rawBody: true })
