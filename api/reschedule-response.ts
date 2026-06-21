import { handler } from '../netlify/functions/reschedule-response'
import { toVercel } from '../lib/vercel-adapter'

export default toVercel(handler)
