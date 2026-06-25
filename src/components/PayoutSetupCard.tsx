import { useEffect, useState } from 'react'
import { CreditCard, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getConnectStatus, startConnectOnboarding } from '@/lib/payments'
import { toast } from 'sonner'

type Status = Awaited<ReturnType<typeof getConnectStatus>>

// Expert-facing Stripe Connect onboarding card. Shows live payout-readiness
// and launches Stripe's hosted onboarding. A pro must reach "payouts enabled"
// before patients can book (and pay) them.
export default function PayoutSetupCard() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)

  const refresh = async () => {
    try {
      setStatus(await getConnectStatus())
    } catch (e: any) {
      console.error('connect status error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // If we just returned from Stripe onboarding, surface a toast.
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe') === 'return') {
      toast.success('Stripe details submitted', { description: 'Verifying your payout account…' })
    }
  }, [])

  const onConnect = async () => {
    setWorking(true)
    try {
      const { url } = await startConnectOnboarding()
      window.location.href = url
    } catch (e: any) {
      toast.error('Could not start Stripe onboarding', { description: e.message })
      setWorking(false)
    }
  }

  const ready = status?.payouts_enabled
  const partiallyDone = status?.connected && !status?.payouts_enabled

  return (
    <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              ready ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'
            }`}
          >
            {ready ? <CheckCircle2 className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-black/40 mb-1">Payouts</p>
            <h3 className="text-xl font-bold text-black">
              {loading
                ? 'Checking payout account…'
                : ready
                ? 'Payouts enabled'
                : partiallyDone
                ? 'Finish your Stripe setup'
                : 'Connect Stripe to get paid'}
            </h3>
            <p className="text-sm text-black/60 mt-1 max-w-md">
              {ready
                ? 'You can receive payouts. Funds are released automatically after each completed session.'
                : 'Users can only book you once your Stripe payout account is active. Stripe securely handles your bank and identity details — we never store them.'}
            </p>
            {partiallyDone && (status?.requirements_due?.length ?? 0) > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Stripe still needs: {status?.requirements_due?.slice(0, 3).join(', ')}
              </p>
            )}
          </div>
        </div>

        {!ready && (
          <Button onClick={onConnect} disabled={working || loading} className="shrink-0">
            {working ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting…
              </>
            ) : partiallyDone ? (
              'Finish setup'
            ) : (
              'Connect Stripe'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
