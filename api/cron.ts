import { runScheduledJobs } from '../netlify/functions/_shared/jobs'

// Vercel cron endpoint (configured in vercel.json). Runs the hourly payment
// lifecycle rules. Optionally protected by CRON_SECRET.
export default async function handler(req: any, res: any) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const provided = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '')
    if (provided !== secret) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
  }
  try {
    const summary = await runScheduledJobs()
    res.status(200).json(summary)
  } catch (err: any) {
    console.error('cron error:', err)
    res.status(500).json({ error: err?.message })
  }
}
