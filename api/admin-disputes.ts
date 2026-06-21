import { handler } from '../netlify/functions/admin-disputes'
import { toVercel } from '../lib/vercel-adapter'

export default toVercel(handler)
