import { handler } from '../netlify/functions/raise-dispute'
import { toVercel } from '../lib/vercel-adapter'

export default toVercel(handler)
