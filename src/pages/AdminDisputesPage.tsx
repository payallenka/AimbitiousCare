import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { adminListDisputes, adminResolveDispute, formatPence } from '@/lib/payments'

type Resolution = 'full_refund' | 'partial_refund' | 'expert_wins' | 'dismissed'

// Standalone super-admin page to triage and resolve disputes & safety concerns.
export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open')
  const [refundPounds, setRefundPounds] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = async () => {
    try {
      const { disputes } = await adminListDisputes()
      setDisputes(disputes || [])
    } catch (e: any) {
      toast.error('Failed to load disputes', { description: e.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const resolve = async (d: any, resolution: Resolution) => {
    setBusyId(d.id)
    try {
      const workerRefundPence =
        resolution === 'partial_refund'
          ? Math.round(parseFloat(refundPounds[d.id] || '0') * 100)
          : undefined
      if (resolution === 'partial_refund' && (!workerRefundPence || workerRefundPence <= 0)) {
        toast.error('Enter a valid partial refund amount')
        setBusyId(null)
        return
      }
      await adminResolveDispute({ disputeId: d.id, resolution, workerRefundPence, adminNotes: notes[d.id] })
      toast.success('Dispute resolved')
      load()
    } catch (e: any) {
      toast.error('Failed to resolve', { description: e.message })
    } finally {
      setBusyId(null)
    }
  }

  const visible = disputes.filter((d) => {
    if (filter === 'open') return ['open', 'under_review'].includes(d.status)
    if (filter === 'resolved') return ['resolved', 'rejected'].includes(d.status)
    return true
  })
  const resolvedCount = disputes.filter((d) => ['resolved', 'rejected'].includes(d.status)).length
  const openCount = disputes.filter((d) => ['open', 'under_review'].includes(d.status)).length

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black/40" />
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-bg px-4 py-12 sm:px-6 lg:px-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-2">Admin</p>
            <h1 className="text-4xl font-bold text-black flex items-center gap-3">
              <ShieldAlert className="w-8 h-8" /> Disputes &amp; Safety
            </h1>
            <p className="text-black/60 mt-1">Resolve disputes and safety concerns. Payouts stay blocked until resolved.</p>
          </div>
          <div className="flex gap-2">
            {([
              { key: 'open', label: `Open (${openCount})` },
              { key: 'resolved', label: `History (${resolvedCount})` },
              { key: 'all', label: `All (${disputes.length})` },
            ] as const).map((f) => (
              <Button key={f.key} variant={filter === f.key ? 'default' : 'outline'} onClick={() => setFilter(f.key)}>
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-12 text-center">
            <AlertCircle className="w-12 h-12 text-black/20 mx-auto mb-4" />
            <p className="text-black/60">
              {filter === 'resolved' ? 'No resolved cases yet.' : filter === 'open' ? 'No open disputes right now.' : 'No disputes yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {visible.map((d) => {
              const appt = d.appointment
              const resolved = ['resolved', 'rejected'].includes(d.status)
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-3xl border bg-white/60 backdrop-blur-xl p-6 ${
                    d.category === 'safety' ? 'border-red-200' : 'border-black/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          d.category === 'safety' ? 'bg-red-100 text-red-700' : 'bg-black/5 text-black/70'
                        }`}
                      >
                        {d.category === 'safety' ? '🚨 Safety concern' : 'Dispute'} · {d.status}
                      </span>
                      <h3 className="text-lg font-semibold text-black mt-2">{d.reason}</h3>
                      {d.details && <p className="text-sm text-black/60 mt-1">{d.details}</p>}
                      <p className="text-xs text-black/40 mt-2">
                        Raised by {d.raised_by_user?.full_name || 'unknown'} ({d.raised_by_role})
                      </p>
                    </div>
                  </div>

                  {appt && (
                    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/70 grid grid-cols-2 gap-x-6 gap-y-1 mb-4">
                      <div className="flex justify-between"><span>Worker</span><span>{appt.patient?.full_name}</span></div>
                      <div className="flex justify-between"><span>Expert</span><span>{appt.professional?.full_name}</span></div>
                      <div className="flex justify-between"><span>Amount</span><span>{formatPence(appt.amount_pence)}</span></div>
                      <div className="flex justify-between"><span>Commission</span><span>{formatPence(appt.commission_pence)}</span></div>
                      <div className="flex justify-between"><span>Expert payout</span><span>{formatPence(appt.expert_payout_pence)}</span></div>
                      <div className="flex justify-between"><span>Payment</span><span>{appt.payment_status}</span></div>
                    </div>
                  )}

                  {resolved ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-green-800 uppercase tracking-wider text-xs">
                          {d.status === 'rejected' ? 'Dismissed' : 'Resolved'} · {(d.resolution_type || '').replace(/_/g, ' ')}
                        </span>
                        {d.resolved_at && (
                          <span className="text-xs text-green-700">
                            {new Date(d.resolved_at).toLocaleString('en-GB')}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-green-900/80">
                        {d.worker_refund_pence ? (
                          <div className="flex justify-between"><span>Refunded to worker</span><span>{formatPence(d.worker_refund_pence)}</span></div>
                        ) : null}
                        {d.expert_payout_pence ? (
                          <div className="flex justify-between"><span>Paid to expert</span><span>{formatPence(d.expert_payout_pence)}</span></div>
                        ) : null}
                      </div>
                      {d.admin_notes && <p className="mt-2 text-green-900/70"><span className="text-green-700">Notes:</span> {d.admin_notes}</p>}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Partial refund to worker (£)</Label>
                          <Input
                            type="number"
                            value={refundPounds[d.id] || ''}
                            onChange={(e) => setRefundPounds({ ...refundPounds, [d.id]: e.target.value })}
                            placeholder="e.g. 20"
                            className="mt-1 border-black/15"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Admin notes</Label>
                          <Textarea
                            value={notes[d.id] || ''}
                            onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })}
                            rows={1}
                            className="mt-1 border-black/15"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" disabled={busyId === d.id} onClick={() => resolve(d, 'full_refund')}>Full refund</Button>
                        <Button size="sm" variant="outline" disabled={busyId === d.id} onClick={() => resolve(d, 'partial_refund')}>Partial refund</Button>
                        <Button size="sm" variant="outline" disabled={busyId === d.id} onClick={() => resolve(d, 'expert_wins')}>Expert wins</Button>
                        <Button size="sm" variant="ghost" className="border border-black/15" disabled={busyId === d.id} onClick={() => resolve(d, 'dismissed')}>Dismiss</Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
