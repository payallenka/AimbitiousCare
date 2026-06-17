import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, FlaskConical, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { mockPayment } from '@/lib/payments'

// Stand-in for Stripe Checkout while real Connect credentials aren't set up.
// Lets you simulate a successful or failed payment to test the full booking →
// payout lifecycle. Reached via create-checkout when MOCK_PAYMENTS is active.
export default function MockPaymentPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const appointmentId = params.get('appt') || ''
  const [busy, setBusy] = useState<'success' | 'fail' | null>(null)

  const run = async (outcome: 'success' | 'fail') => {
    if (!appointmentId) {
      toast.error('Missing appointment reference')
      return
    }
    setBusy(outcome)
    try {
      await mockPayment(appointmentId, outcome)
      if (outcome === 'success') {
        toast.success('Mock payment successful', { description: 'Funds are now held. Booking sent for approval.' })
        navigate('/my-appointments?payment=success')
      } else {
        toast.info('Mock payment failed', { description: 'The booking was cancelled.' })
        navigate('/book-appointment?payment=cancelled')
      }
    } catch (e: any) {
      toast.error('Mock payment error', { description: e.message })
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-black/10 bg-white/70 backdrop-blur-xl p-8 text-center"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <FlaskConical className="h-7 w-7" />
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">Test mode</p>
        <h1 className="text-2xl font-bold text-black mb-2">Simulated Payment</h1>
        <p className="text-sm text-black/60 mb-8">
          Stripe isn't connected yet, so this stands in for the real checkout. Choose an outcome to test the
          booking and payout flow.
        </p>

        <div className="space-y-3">
          <Button onClick={() => run('success')} disabled={!!busy} className="w-full h-12 text-base">
            {busy === 'success' ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5 mr-2" />
            )}
            Successful payment
          </Button>
          <Button
            onClick={() => run('fail')}
            disabled={!!busy}
            variant="outline"
            className="w-full h-12 text-base border-red-200 text-red-600 hover:bg-red-600 hover:text-white"
          >
            {busy === 'fail' ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-5 w-5 mr-2" />
            )}
            Unsuccessful payment
          </Button>
        </div>

        <button
          onClick={() => navigate('/book-appointment')}
          className="mt-6 text-xs text-black/40 hover:text-black/70"
        >
          Cancel and go back
        </button>
      </motion.div>
    </div>
  )
}
