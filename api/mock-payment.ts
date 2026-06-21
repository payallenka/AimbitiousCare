import { handler } from '../netlify/functions/mock-payment'
import { toVercel } from '../lib/vercel-adapter'

export default toVercel(handler)
