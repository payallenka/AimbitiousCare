import { handler } from '../netlify/functions/expert-decision'
import { toVercel } from '../lib/vercel-adapter'

export default toVercel(handler)
