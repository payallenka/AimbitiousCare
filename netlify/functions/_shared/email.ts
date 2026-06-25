import sgMail from '@sendgrid/mail'
import { supabaseAdmin } from './supabaseAdmin'

// SendGrid email for notifications. Best-effort: no-op if the API key isn't
// configured, and never throws into the caller's critical path.
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || process.env.VITE_SENDGRID_API_KEY || ''
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@ambitiouscare.co'
const APP_URL = process.env.APP_URL || 'https://app.ambitiouscare.co'

let configured = false
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY)
  configured = true
}

export async function sendNotificationEmail(opts: {
  userId?: string
  to?: string
  title: string
  body?: string
  link?: string
}): Promise<void> {
  if (!configured) return
  try {
    let to = opts.to
    if (!to && opts.userId) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', opts.userId)
        .maybeSingle()
      to = data?.email || undefined
    }
    if (!to) return

    const url = opts.link ? `${APP_URL}${opts.link.startsWith('/') ? '' : '/'}${opts.link}` : ''
    const button = url
      ? `<a href="${url}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;margin-top:16px">Open Ambitious Care</a>`
      : ''

    await sgMail.send({
      to,
      from: FROM_EMAIL,
      subject: opts.title,
      text: `${opts.body || opts.title}${url ? `\n\n${url}` : ''}`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
        <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#888;margin:0 0 8px">Ambitious Care</p>
        <h2 style="margin:0 0 12px;font-size:20px">${opts.title}</h2>
        ${opts.body ? `<p style="font-size:15px;line-height:1.6;color:#444;margin:0">${opts.body}</p>` : ''}
        ${button}
        <p style="font-size:12px;color:#aaa;margin-top:28px">You're receiving this because of activity on your Ambitious Care account.</p>
      </div>`,
    })
  } catch (e) {
    console.error('sendNotificationEmail failed:', e)
  }
}
