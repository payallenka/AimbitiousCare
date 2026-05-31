import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import Sidebar from '@/components/Sidebar'
import { InfoDialogButton } from '@/components/InfoDialog'
import { useAuth } from '@/contexts/AuthContext'
import { format, formatDistanceToNow } from 'date-fns'

interface RapidAlert {
  id: string
  patient_id: string
  message: string
  urgency_level: string
  status: string
  created_at: string
  updated_at: string
  patient: {
    id: string
    full_name: string
    email: string
    phone_number: string
  }
}

export default function RapidAlertInboxPage() {
  const { userProfile } = useAuth()
  const [alerts, setAlerts] = useState<RapidAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'viewed' | 'cleared'>('all')
  const [selectedAlert, setSelectedAlert] = useState<RapidAlert | null>(null)

  useEffect(() => {
    if (userProfile) {
      fetchAlerts()
      
      // Set up real-time subscription
      const subscription = supabase
        .channel('rapid_alerts_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rapid_alerts',
          },
          () => {
            fetchAlerts()
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [userProfile, filter])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('rapid_alerts')
        .select(`
          *,
          patient:users!rapid_alerts_patient_id_fkey(
            id,
            full_name,
            email,
            phone_number
          )
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setAlerts(data || [])
    } catch (error: any) {
      console.error('Error fetching alerts:', error)
      toast.error('Failed to load rapid alerts')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsViewed = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('rapid_alerts')
        .update({ status: 'viewed' })
        .eq('id', alertId)

      if (error) throw error
      
      toast.success('Alert marked as viewed')
      fetchAlerts()
    } catch (error: any) {
      console.error('Error updating alert:', error)
      toast.error('Failed to update alert')
    }
  }

  const handleClearAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('rapid_alerts')
        .update({ status: 'cleared' })
        .eq('id', alertId)

      if (error) throw error
      
      toast.success('Alert cleared')
      fetchAlerts()
      if (selectedAlert?.id === alertId) {
        setSelectedAlert(null)
      }
    } catch (error: any) {
      console.error('Error clearing alert:', error)
      toast.error('Failed to clear alert')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-white/70 text-black/70 border border-black/15'
      case 'viewed':
        return 'bg-black text-white border border-black'
      case 'cleared':
        return 'bg-white/40 text-black/50 border border-black/15'
      default:
        return 'bg-white/60 text-black/60 border border-black/15'
    }
  }

  const getUrgencyColor = (level: string) => {
    return level === 'critical'
      ? 'bg-black text-white border border-black'
      : 'bg-white/70 text-black/70 border border-black/15'
  }

  const filteredAlerts = alerts.filter((alert) =>
    filter === 'all' ? true : alert.status === filter
  )
  const pendingCount = alerts.filter(a => a.status === 'pending').length
  const viewedCount = alerts.filter(a => a.status === 'viewed').length
  const clearedCount = alerts.filter(a => a.status === 'cleared').length

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
        <Sidebar />
        <div className="flex-1 w-full flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl px-10 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border border-black/20 border-t-black mb-4"></div>
            <p className="text-black/70">Loading rapid alerts...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 w-full px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-10"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-3">Alerts</p>
            <h1 className="text-4xl font-heading font-bold text-black mb-2">Rapid Alert Inbox</h1>
            <p className="text-muted-foreground">
              Respond to urgent requests from patients who need immediate support
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className="px-6"
            >
              All ({alerts.length})
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              onClick={() => setFilter('pending')}
              className="px-6"
            >
              Pending ({pendingCount})
            </Button>
            <Button
              variant={filter === 'viewed' ? 'default' : 'outline'}
              onClick={() => setFilter('viewed')}
              className="px-6"
            >
              Viewed ({viewedCount})
            </Button>
            <Button
              variant={filter === 'cleared' ? 'default' : 'outline'}
              onClick={() => setFilter('cleared')}
              className="px-6"
            >
              Cleared ({clearedCount})
            </Button>
            <InfoDialogButton
              title="Rapid Alert Guide"
              description="Handle urgent requests from patients quickly and consistently."
              points={[
                'Switch tabs to track new, viewed, or cleared incidents.',
                'Select an alert to read the full message and contact info.',
                'Mark as viewed when acknowledged and resolve once actioned.',
              ]}
              triggerClassName="hidden xl:inline-flex h-10"
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="rounded-2xl border border-black/10 bg-white/60 backdrop-blur-xl p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">Total</p>
            <p className="text-3xl font-bold text-black">{alerts.length}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white/60 backdrop-blur-xl p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">Pending</p>
            <p className="text-3xl font-bold text-black">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white/60 backdrop-blur-xl p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">Viewed</p>
            <p className="text-3xl font-bold text-black">{viewedCount}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white/60 backdrop-blur-xl p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">Cleared</p>
            <p className="text-3xl font-bold text-black">{clearedCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {filteredAlerts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-12 text-center"
              >
                <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-black/15 bg-white/80 text-xs tracking-[0.3em] font-semibold text-black">
                  NONE
                </div>
                <p className="text-black/60">
                  {filter === 'all' ? 'No rapid alerts received yet.' : `No ${filter} alerts.`}
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredAlerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative overflow-hidden rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-2xl ${
                      selectedAlert?.id === alert.id ? 'ring-2 ring-black' : ''
                    }`}
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition" />
                    <div className="relative flex items-start justify-between gap-4 mb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.3em] ${getUrgencyColor(alert.urgency_level)}`}>
                          <AlertTriangle className="w-3 h-3 mr-2" />
                          {alert.urgency_level}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.3em] ${getStatusColor(alert.status)}`}>
                          {alert.status}
                        </span>
                      </div>
                      <span className="text-xs uppercase tracking-[0.3em] text-black/40">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="relative rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/70 leading-relaxed">
                      <div className="mb-2 text-xs uppercase tracking-[0.3em] text-black/40">Message</div>
                      <p className="line-clamp-3">{alert.message}</p>
                    </div>
                    <div className="relative mt-4 flex items-center justify-between text-xs text-black/60">
                      <span>{alert.patient.full_name}</span>
                      <div className="flex gap-2">
                        {alert.status === 'pending' && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsViewed(alert.id)
                            }}
                            size="sm"
                            variant="ghost"
                            className="border border-black/15 bg-white/80 hover:bg-black hover:text-white"
                          >
                            Mark viewed
                          </Button>
                        )}
                        {alert.status !== 'cleared' && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleClearAlert(alert.id)
                            }}
                            size="sm"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedAlert ? (
                <motion.div
                  key={selectedAlert.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-6 space-y-5 sticky top-6"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-black">Alert Details</h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.3em] ${getStatusColor(selectedAlert.status)}`}>
                        {selectedAlert.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-black/70">
                      <p className="uppercase text-xs tracking-[0.3em] text-black/40">Urgency</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.3em] ${getUrgencyColor(selectedAlert.urgency_level)}`}>
                        {selectedAlert.urgency_level}
                      </span>
                    </div>
                  </div>

                  <div className="relative border-t border-black/10 pt-5">
                    <h4 className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">Patient</h4>
                    <div className="space-y-2 text-sm text-black/70">
                      <p>{selectedAlert.patient.full_name}</p>
                      <p>{selectedAlert.patient.email}</p>
                      <p>{selectedAlert.patient.phone_number}</p>
                    </div>
                  </div>

                  <div className="relative border-t border-black/10 pt-5">
                    <h4 className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">Message</h4>
                    <p className="text-sm text-black/70 leading-relaxed whitespace-pre-wrap">
                      {selectedAlert.message}
                    </p>
                  </div>

                  <div className="relative border-t border-black/10 pt-5 text-xs text-black/50">
                    Sent {format(new Date(selectedAlert.created_at), 'MMM d, yyyy h:mm a')}
                  </div>

                  <div className="relative space-y-2">
                    {selectedAlert.status === 'pending' && (
                      <Button
                        onClick={() => handleMarkAsViewed(selectedAlert.id)}
                        variant="outline"
                        className="w-full border border-black/15 bg-white/80 hover:bg-black hover:text-white"
                      >
                        Mark as viewed
                      </Button>
                    )}
                    {selectedAlert.status !== 'cleared' && (
                      <Button
                        onClick={() => handleClearAlert(selectedAlert.id)}
                        className="w-full"
                      >
                        Clear alert
                      </Button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-12 text-center sticky top-6"
                >
                  <p className="text-black/60">Select an alert to view details.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

