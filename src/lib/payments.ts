import { supabase } from './supabase'

// Mirrors the server's mock detection: no publishable key => mock mode.
export const IS_MOCK_PAYMENTS = !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

// True once the session's scheduled end (date + time + duration) has passed.
export function sessionHasEnded(appt: {
  confirmed_date?: string | null
  confirmed_time?: string | null
  requested_date?: string | null
  requested_time?: string | null
  duration_minutes?: number | null
}): boolean {
  const date = appt.confirmed_date || appt.requested_date
  const time = appt.confirmed_time || appt.requested_time
  if (!date || !time) return false
  const endMs = new Date(`${date}T${time}`).getTime() + (appt.duration_minutes || 60) * 60000
  return Date.now() >= endMs
}

// Calls a Netlify Function with the current user's Supabase access token.
// All payment/payout/dispute server logic lives in netlify/functions/*.
// Serverless function base path. Defaults to Vercel's /api; override with
// VITE_FUNCTIONS_BASE=/.netlify/functions for local `netlify dev`.
const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_BASE || '/api'
// On Vercel (/api) every endpoint is dispatched through a single /api/fn
// router (Hobby plan caps functions at 12). Local netlify dev uses per-file.
const USE_ROUTER = FUNCTIONS_BASE === '/api'

async function callFunction<T = any>(name: string, body?: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token

  const url = USE_ROUTER ? `${FUNCTIONS_BASE}/fn` : `${FUNCTIONS_BASE}/${name}`
  const payload = USE_ROUTER ? { ...(body as object), __fn: name } : body

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: USE_ROUTER ? JSON.stringify(payload) : body ? JSON.stringify(body) : undefined,
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json?.error || json?.details || `Request failed (${res.status})`)
  }
  return json as T
}

// ---- Booking & payment ----
export interface CreateCheckoutInput {
  professionalId: string
  requestedDate: string
  requestedTime: string
  sessionType: 'online' | 'offline'
  onlinePlatform?: 'google_meet' | 'zoom'
  message?: string
  concerns?: string
  goals?: string
  consent: boolean
}

export function createCheckout(input: CreateCheckoutInput) {
  return callFunction<{ url: string; appointmentId: string; mock?: boolean }>('create-checkout', input)
}

// Test-only: simulate a payment outcome (mirrors the Stripe webhook).
export function mockPayment(appointmentId: string, outcome: 'success' | 'fail') {
  return callFunction<{ outcome: string; status: string }>('mock-payment', { appointmentId, outcome })
}

// ---- Expert Stripe Connect onboarding ----
export function startConnectOnboarding() {
  return callFunction<{ url: string; accountId: string }>('connect-onboard')
}

export function getConnectStatus() {
  return callFunction<{
    connected: boolean
    charges_enabled: boolean
    payouts_enabled: boolean
    onboarding_completed?: boolean
    requirements_due?: string[]
  }>('connect-status')
}

// ---- Appointment lifecycle ----
export function expertDecision(input: {
  appointmentId: string
  decision: 'accept' | 'reject' | 'reschedule'
  meetingLink?: string
  location?: string
  proposedDate?: string
  proposedTime?: string
  reason?: string
  response?: string
}) {
  return callFunction('expert-decision', input)
}

export function completeSession(input: {
  appointmentId: string
  sessionSummary: string
  sessionNotes: string
  durationMinutes: number
}) {
  return callFunction('complete-session', input)
}

export function workerConfirm(appointmentId: string) {
  return callFunction('worker-confirm', { appointmentId })
}

export function rescheduleResponse(appointmentId: string, action: 'accept' | 'reject') {
  return callFunction('reschedule-response', { appointmentId, action })
}

export function cancelAppointment(appointmentId: string) {
  return callFunction('cancel-appointment', { appointmentId })
}

export function raiseDispute(input: {
  appointmentId: string
  category?: 'standard' | 'safety'
  reason: string
  details?: string
}) {
  return callFunction('raise-dispute', input)
}

export function adminResolveDispute(input: {
  disputeId: string
  resolution: 'full_refund' | 'partial_refund' | 'expert_wins' | 'dismissed'
  workerRefundPence?: number
  adminNotes?: string
}) {
  return callFunction('admin-resolve-dispute', input)
}

export function adminListDisputes() {
  return callFunction<{ disputes: any[] }>('admin-disputes')
}

// ---- Display helpers ----
export function formatPence(pence?: number | null): string {
  if (pence === null || pence === undefined) return '—'
  return `£${(pence / 100).toFixed(2)}`
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  paid_held: 'Paid · Held',
  ready_for_release: 'Ready for release',
  released: 'Paid out',
  refund_initiated: 'Refund initiated',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
  payout_failed: 'Payout failed',
}

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending approval',
  confirmed: 'Confirmed',
  reschedule_pending: 'Reschedule proposed',
  awaiting_confirmation: 'Awaiting your confirmation',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
  under_investigation: 'Under investigation',
  no_show: 'No show',
}
