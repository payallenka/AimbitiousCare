import { Handler } from '@netlify/functions'
import sgMail from '@sendgrid/mail'

// Initialize SendGrid with API key from environment variables
// NOTE: Netlify Functions use non-VITE prefixed env vars
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || process.env.VITE_SENDGRID_API_KEY || ''

// Log for debugging (will show in Netlify function logs)
console.log('SendGrid API Key exists:', !!SENDGRID_API_KEY)
console.log('API Key starts with SG.:', SENDGRID_API_KEY.startsWith('SG.'))

if (!SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY not found in environment variables!')
} else {
  sgMail.setApiKey(SENDGRID_API_KEY)
  console.log('✅ SendGrid initialized')
}

interface InvitationRequest {
  email: string
  companyName: string
  invitationToken?: string
  appUrl: string
}

export const handler: Handler = async (event) => {
  console.log('📧 Invitation function called')
  console.log('Method:', event.httpMethod)
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    // Check if SendGrid is configured
    if (!SENDGRID_API_KEY) {
      console.error('❌ SendGrid API key not configured')
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Email service not configured',
          details: 'SENDGRID_API_KEY environment variable is missing'
        }),
      }
    }

    const body: InvitationRequest = JSON.parse(event.body || '{}')
    const { email, companyName, invitationToken, appUrl } = body

    console.log('📨 Sending invitation to:', email)
    console.log('Company:', companyName)

    // Validation
    if (!email || !companyName || !appUrl) {
      console.error('❌ Missing required fields')
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      }
    }

    const sanitizedToken = invitationToken && invitationToken.trim().length > 0 ? invitationToken : null
    const signupLink = sanitizedToken ? `${appUrl}/register?invite=${sanitizedToken}` : `${appUrl}/register`
    const callToAction = sanitizedToken ? 'Accept Invitation & Sign Up' : 'Create Your Account'

    // Email content
    const msg = {
      to: email,
      from: 'noreply@ambitiouscare.co', // Verified domain in SendGrid
      subject: `${companyName} has invited you to AmbitiousCare`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're Invited to AmbitiousCare</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f7efe3;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
        <body style="margin: 0; padding: 48px 0; font-family: 'Inter', Arial, sans-serif; background-color: #f7efe3;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center">
                <table role="presentation" style="width: 640px; max-width: 90%; border-collapse: collapse; background-color: #ffffff; border-radius: 24px; box-shadow: 0 24px 48px rgba(17, 17, 17, 0.08); overflow: hidden;">
                  <tr>
                    <td style="padding: 40px; background-color: #1a1a1a; color: #ffffff;">
                      <p style="margin: 0; letter-spacing: 0.6em; text-transform: uppercase; font-size: 11px; opacity: 0.8;">AmbitiousCare</p>
                      <h1 style="margin: 16px 0 0 0; font-size: 30px; font-weight: 700; letter-spacing: -0.02em;">Invitation to AmbitiousCare</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px">
                      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.7; color: #1a1a1a;">
                        <strong>${companyName}</strong> has invited you to join <strong>AmbitiousCare</strong>, a tailored mental health and wellbeing platform built for high-demand industries.
                      </p>

                      <div style="border: 1px solid rgba(26,26,26,0.12); border-radius: 18px; padding: 24px; margin-bottom: 32px; background: rgba(247, 239, 227, 0.6);">
                        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Inside the platform:</h2>
                        <ul style="padding-left: 18px; margin: 0; color: #303030; font-size: 15px; line-height: 1.6;">
                          <li style="margin-bottom: 8px;">Always-on access to licensed therapists and specialists</li>
                          <li style="margin-bottom: 8px;">Instant support with our AI companion and resource library</li>
                          <li style="margin-bottom: 8px;">Exclusive wellbeing benefits, offers, and community insights</li>
                          <li>Secure, confidential space aligned with the AmbitiousCare ethos</li>
                        </ul>
                      </div>

                      <div style="text-align: center; margin-bottom: 28px;">
                        <a href="${signupLink}" style="display: inline-block; padding: 16px 44px; border-radius: 999px; font-weight: 700; font-size: 15px; letter-spacing: 0.1em; text-transform: uppercase; background-color: #1a1a1a; color: #ffffff; text-decoration: none;">${callToAction}</a>
                      </div>

                      <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.6; color: #444;">
                        The link above opens your dedicated onboarding flow. If the button is unavailable, copy and paste this address into your browser:
                      </p>
                      <p style="margin: 0 0 28px 0; font-size: 13px; color: #1a1a1a; word-break: break-all;">${signupLink}</p>

                      ${sanitizedToken ? `<p style="margin: 0 0 28px 0; font-size: 13px; color: #444;">This invitation link remains valid for 7 days.</p>` : ''}

                      <p style="margin: 0; font-size: 13px; color: #444;">
                        If you were not expecting this invitation, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 28px 40px; background-color: #faf6ee; text-align: center; color: #555; font-size: 12px;">
                      <p style="margin: 0 0 6px 0; letter-spacing: 0.4em; text-transform: uppercase;">AmbitiousCare</p>
                      <p style="margin: 0 0 4px 0;">Elevating wellbeing for construction professionals and beyond.</p>
                      <p style="margin: 0;">© ${new Date().getFullYear()} AmbitiousCare. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
You're Invited to AmbitiousCare!

${companyName} has invited you to join AmbitiousCare - a comprehensive mental health and wellness platform.

What You'll Get:
- Access to licensed therapists and mental health professionals
- AI-powered wellness chatbot available 24/7
- Exclusive deals and wellness benefits
- Confidential and secure platform
- Community support and resources

Follow this link to continue your registration:
${signupLink}

If you believe this was sent in error, you can safely ignore this email.

© ${new Date().getFullYear()} AmbitiousCare
      `,
    }

    console.log('📤 Attempting to send email...')
    
    // Send email
    await sgMail.send(msg)

    console.log('✅ Email sent successfully to:', email)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Invitation email sent successfully',
      }),
    }
  } catch (error: any) {
    console.error('❌ SendGrid Error:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    
    if (error.response) {
      console.error('Response body:', JSON.stringify(error.response.body, null, 2))
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send invitation email',
        details: error.message,
        code: error.code,
      }),
    }
  }
}
