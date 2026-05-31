import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Send, Clock, CheckCircle, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import Sidebar from '@/components/Sidebar'
import { InfoDialogButton } from '@/components/InfoDialog'
import { useAuth } from '@/contexts/AuthContext'
import { startOfMonth, format } from 'date-fns'

interface RapidAlert {
  id: string
  message: string
  urgency_level: string
  status: string
  created_at: string
}

interface AlertUsage {
  alerts_used: number
  alerts_remaining: number
}

export default function RapidAlertPage() {
  const { userProfile } = useAuth()
  const [message, setMessage] = useState('')
  const [urgencyLevel, setUrgencyLevel] = useState<'high' | 'critical'>('high')
  const [loading, setLoading] = useState(false)
  const [alertUsage, setAlertUsage] = useState<AlertUsage>({ alerts_used: 0, alerts_remaining: 2 })
  const [myAlerts, setMyAlerts] = useState<RapidAlert[]>([])
  const [loadingUsage, setLoadingUsage] = useState(true)

  useEffect(() => {
    if (userProfile) {
      fetchAlertUsage()
      fetchMyAlerts()
    }
  }, [userProfile])

  const fetchAlertUsage = async () => {
    if (!userProfile) return

    try {
      setLoadingUsage(true)
      
      // Count alerts sent this month
      const startOfCurrentMonth = startOfMonth(new Date()).toISOString()
      
      const { count, error } = await supabase
        .from('rapid_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', userProfile.id)
        .gte('created_at', startOfCurrentMonth)

      if (error) throw error

      const used = count || 0
      const remaining = Math.max(2 - used, 0)

      setAlertUsage({
        alerts_used: used,
        alerts_remaining: remaining,
      })
    } catch (error: any) {
      console.error('Error fetching alert usage:', error)
    } finally {
      setLoadingUsage(false)
    }
  }

  const fetchMyAlerts = async () => {
    if (!userProfile) return

    try {
      const { data, error } = await supabase
        .from('rapid_alerts')
        .select('*')
        .eq('patient_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setMyAlerts(data || [])
    } catch (error: any) {
      console.error('Error fetching alerts:', error)
    }
  }

  const handleSendAlert = async () => {
    if (!userProfile || !message.trim()) {
      toast.error('Please enter a message')
      return
    }

    if (alertUsage.alerts_remaining <= 0) {
      toast.error('You have used all your rapid alerts for this month')
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('rapid_alerts')
        .insert({
          patient_id: userProfile.id,
          message: message.trim(),
          urgency_level: urgencyLevel,
          status: 'pending',
        })

      if (error) throw error

      toast.success('Rapid alert sent to all therapists!', {
        description: 'A therapist will review your alert shortly.',
      })

      setMessage('')
      setUrgencyLevel('high')
      
      // Refresh usage and alerts
      await fetchAlertUsage()
      await fetchMyAlerts()
    } catch (error: any) {
      console.error('Error sending alert:', error)
      toast.error('Failed to send rapid alert')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-white/70 text-black/70 border-black/15'
      case 'viewed':
        return 'bg-white/50 text-black/60 border-black/15'
      case 'cleared':
        return 'bg-black text-white border-black'
      default:
        return 'bg-white/60 text-black/60 border-black/15'
    }
  }

  const getUrgencyColor = (level: string) => {
    return level === 'critical'
      ? 'bg-black text-white border-black'
      : 'bg-white/70 text-black/70 border-black/15'
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <Sidebar />

      <div className="flex-1 w-full px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-3">Emergency</p>
            <h1 className="text-4xl font-heading font-bold text-black mb-2">Rapid Alert</h1>
            <p className="text-black/60">
              Send urgent alerts to therapists when you need immediate support.
            </p>
          </div>
          <InfoDialogButton
            title="When to use Rapid Alert"
            description="Trigger direct notifications to therapists in moments of critical need."
            points={[
              'You get two rapid alerts each month—save them for serious, time-sensitive situations.',
              'Describe how you are feeling so therapists can respond appropriately.',
              'Watch the tracker to see how many alerts you have left this month.',
            ]}
          />
        </motion.div>

        {/* Usage Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-6 mb-8 shadow-lg"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-black text-white rounded-2xl p-4">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-semibold mb-1">Monthly Quota</h3>
                <p className="text-sm text-black/60">
                  Resets on {format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), 'MMMM 1st')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-black">
                  {loadingUsage ? '...' : alertUsage.alerts_remaining}
                </div>
                <div className="text-xs text-black/50 uppercase">Remaining</div>
              </div>
              <div className="h-12 w-px bg-black/10"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-black/50">
                  {loadingUsage ? '...' : alertUsage.alerts_used}
                </div>
                <div className="text-xs text-black/50 uppercase">Used</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Send Alert Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-8 mb-8 shadow-lg"
        >
          <h2 className="text-2xl font-heading font-semibold mb-6">Send Rapid Alert</h2>
          
          {/* Info Box */}
          <div className="bg-white/70 border border-black/10 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Info className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
            <div className="text-sm text-black/70">
              <p className="font-semibold mb-1">Suggested reasons:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Experiencing a mental health crisis</li>
                <li>Need urgent emotional support</li>
                <li>Feeling overwhelmed or in distress</li>
              </ul>
            </div>
          </div>

          {/* Urgency Level */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-3">Urgency Level</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setUrgencyLevel('high')}
                className={`p-4 rounded-xl border transition-all ${
                  urgencyLevel === 'high'
                    ? 'border-black bg-white text-black'
                    : 'border-black/10 bg-white/60 hover:border-black'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-6 h-6 ${urgencyLevel === 'high' ? 'text-black' : 'text-black/40'}`} />
                  <div className="text-left">
                    <div className="font-semibold">High</div>
                    <div className="text-xs text-black/50">Need support soon</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setUrgencyLevel('critical')}
                className={`p-4 rounded-xl border transition-all ${
                  urgencyLevel === 'critical'
                    ? 'border-black bg-black text-white'
                    : 'border-black/10 bg-white/60 hover:border-black'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-6 h-6 ${urgencyLevel === 'critical' ? 'text-white animate-pulse' : 'text-black/40'}`} />
                  <div className="text-left">
                    <div className="font-semibold">Critical</div>
                    <div className="text-xs text-white/70">Urgent assistance needed</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-3">Your Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you're experiencing and what support you need..."
              className="min-h-[150px] resize-none"
              maxLength={1000}
            />
            <div className="text-xs text-black/50 mt-2 text-right">
              {message.length}/1000 characters
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendAlert}
            disabled={loading || !message.trim() || alertUsage.alerts_remaining <= 0}
            size="lg"
            className="w-full bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 disabled:bg-red-400 disabled:border-red-400"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                Sending Alert...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Send Rapid Alert to All Therapists
              </>
            )}
          </Button>

          {alertUsage.alerts_remaining <= 0 && (
            <p className="text-black text-sm mt-3 text-center">
              You've used all your rapid alerts for this month. Quota resets on the 1st.
            </p>
          )}
        </motion.div>

        {/* Recent Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-8 shadow-lg"
        >
          <h2 className="text-2xl font-heading font-semibold mb-6">Your Recent Alerts</h2>
          
          <AnimatePresence mode="popLayout">
            {myAlerts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <AlertTriangle className="w-16 h-16 text-black/30 mx-auto mb-4" />
                <p className="text-black/60">No rapid alerts sent yet</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {myAlerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-black/10 rounded-2xl p-4 hover:border-black transition-all bg-white/70"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.3em] ${getUrgencyColor(alert.urgency_level)}`}>
                          {alert.urgency_level}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.3em] ${getStatusColor(alert.status)}`}>
                          {alert.status === 'cleared' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {alert.status}
                        </span>
                      </div>
                      <span className="text-xs text-black/50 whitespace-nowrap">
                        {format(new Date(alert.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-black/70 leading-relaxed">{alert.message}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

