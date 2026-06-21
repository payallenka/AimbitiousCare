import { handler } from '../netlify/functions/connect-onboard'
import { toVercel } from '../lib/vercel-adapter'

export default toVercel(handler)
