import { handler } from '../netlify/functions/worker-confirm'
import { toVercel } from '../lib/vercel-adapter'

export default toVercel(handler)
