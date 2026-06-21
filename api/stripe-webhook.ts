import { handler } from '../netlify/functions/stripe-webhook'
import { toVercel } from '../lib/vercel-adapter'

// Stripe needs the raw, unparsed request body to verify the signature.
export const config = { api: { bodyParser: false } }

export default toVercel(handler, { rawBody: true })
