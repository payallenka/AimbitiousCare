import { handler } from '../netlify/functions/connect-status'
import { toVercel } from '../lib/vercel-adapter'

export default toVercel(handler)
