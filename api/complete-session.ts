import { handler } from '../netlify/functions/complete-session'
import { toVercel } from '../lib/vercel-adapter'

export default toVercel(handler)
