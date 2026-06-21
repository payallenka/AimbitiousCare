import { handler } from '../netlify/functions/create-checkout'
import { toVercel } from '../lib/vercel-adapter'

export default toVercel(handler)
