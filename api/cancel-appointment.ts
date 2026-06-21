import { handler } from '../netlify/functions/cancel-appointment'
import { toVercel } from '../lib/vercel-adapter'

export default toVercel(handler)
