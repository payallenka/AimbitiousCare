import { handler } from '../netlify/functions/admin-resolve-dispute'
import { toVercel } from '../lib/vercel-adapter'

export default toVercel(handler)
