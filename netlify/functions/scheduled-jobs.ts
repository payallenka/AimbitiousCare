import { schedule } from '@netlify/functions'
import { runScheduledJobs } from './_shared/jobs'

// Netlify hourly cron. (Vercel uses api/cron.ts + vercel.json crons instead.)
export const handler = schedule('@hourly', async () => {
  try {
    const summary = await runScheduledJobs()
    return { statusCode: 200, body: JSON.stringify(summary) }
  } catch (err: any) {
    console.error('scheduled-jobs error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
})
