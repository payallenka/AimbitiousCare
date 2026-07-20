import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, MessageCircle, CheckCircle, XCircle, AlertCircle, Plus, Video, MapPin, ShieldAlert, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Sidebar from '@/components/Sidebar'
import { InfoDialogButton } from '@/components/InfoDialog'
import { useNavigate } from 'react-router-dom'
import {
  cancelAppointment as cancelAppointmentApi,
  workerConfirm,
  raiseDispute,
  rescheduleResponse,
  formatPence,
  sessionHasEnded,
  IS_MOCK_PAYMENTS,
  getPayoutStatus,
  PAYOUT_TONE_CLASSES,
} from '@/lib/payments'

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" fill="%23f5f5dc"/%3E%3Ccircle cx="32" cy="24" r="12" fill="%23000"/%3E%3Cpath fill="%23000" d="M16 54c0-8.8 7.2-16 16-16s16 7.2 16 16z"/%3E%3C/svg%3E'

interface AppointmentRequest {
  id: string
  professional_id: string
  requested_date: string
  requested_time: string
  duration_minutes: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'reschedule_pending' | 'awaiting_confirmation' | 'disputed' | 'under_investigation'
  session_type?: 'online' | 'offline'
  online_platform?: 'google_meet' | 'zoom'
  meeting_link?: string
  location?: string
  payment_status?: string
  amount_pence?: number
  proposed_date?: string
  proposed_time?: string
  reschedule_count?: number
  worker_confirmed_at?: string
  session_completed_at?: string
  session_summary?: string
  patient_message?: string
  professional_response?: string
  reschedule_reason?: string
  confirmed_date?: string
  confirmed_time?: string
  created_at: string
  professional: {
    full_name: string
    email: string
    phone_number: string
    profile_picture_url?: string
    professional_profiles: {
      professional_title: string
      appointment_fee?: number
    } | null
  }
}

export default function PatientAppointmentsPage() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<AppointmentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all')

  useEffect(() => {
    if (userProfile) {
      fetchAppointments()
    }
  }, [userProfile])

  const fetchAppointments = async () => {
    if (!userProfile) return

    try {
      // Fetch appointment requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('appointment_requests')
        .select('*')
        .eq('patient_id', userProfile.id)
        .order('created_at', { ascending: false })

      if (requestsError) throw requestsError

      if (!requestsData || requestsData.length === 0) {
        setAppointments([])
        setLoading(false)
        return
      }

      // Get unique professional IDs
      const professionalIds = [...new Set(requestsData.map(r => r.professional_id))]

      // Fetch professional details
      const { data: professionalsData, error: professionalsError } = await supabase
        .from('users')
        .select('id, full_name, email, phone_number, profile_picture_url')
        .in('id', professionalIds)

      if (professionalsError) throw professionalsError

      // Fetch professional profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('professional_profiles')
        .select('user_id, professional_title, appointment_fee')
        .in('user_id', professionalIds)

      if (profilesError) throw profilesError

      // Combine data
      const combinedData = requestsData.map(request => {
        const professional = professionalsData?.find(p => p.id === request.professional_id)
        const profile = profilesData?.find(p => p.user_id === request.professional_id)
        
        return {
          ...request,
          professional: {
            full_name: professional?.full_name || 'Unknown Professional',
            email: professional?.email || '',
            phone_number: professional?.phone_number || '',
            profile_picture_url: professional?.profile_picture_url || null,
            professional_profiles: profile ? {
              professional_title: profile.professional_title,
              appointment_fee: profile.appointment_fee
            } : null
          }
        }
      })

      setAppointments(combinedData)
    } catch (error: any) {
      console.error('Error fetching appointments:', error)
      toast.error('Failed to load appointments', {
        description: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const [busyId, setBusyId] = useState<string | null>(null)

  const withBusy = async (id: string, fn: () => Promise<any>, successMsg: string) => {
    setBusyId(id)
    try {
      await fn()
      toast.success(successMsg)
      fetchAppointments()
    } catch (error: any) {
      console.error(error)
      toast.error('Action failed', { description: error.message })
    } finally {
      setBusyId(null)
    }
  }

  const handleCancel = (id: string) =>
    withBusy(id, () => cancelAppointmentApi(id), 'Appointment successfully cancelled')

  const handleConfirmSession = (id: string) =>
    withBusy(id, () => workerConfirm(id), 'Session confirmed — thank you!')

  const handleReportIssue = (id: string) => {
    const reason = window.prompt('Briefly describe the issue with this session:')
    if (!reason) return
    withBusy(id, () => raiseDispute({ appointmentId: id, category: 'standard', reason }), 'Issue reported. Our team will review it.')
  }

  const handleSafetyConcern = (id: string) => {
    if (!window.confirm('Are you experiencing a safety concern during this session? This will alert our team immediately and freeze the payment.')) return
    const reason = window.prompt('Optionally add detail (you can leave this blank):') || 'Emergency safety concern reported'
    withBusy(id, () => raiseDispute({ appointmentId: id, category: 'safety', reason }), '🚨 Safety concern reported. Our team has been alerted.')
  }

  const handleReschedule = (id: string, action: 'accept' | 'reject') =>
    withBusy(
      id,
      () => rescheduleResponse(id, action),
      action === 'accept' ? 'New time accepted.' : 'Reschedule declined — a full refund has been initiated.',
    )

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': 
        return { 
          color: 'bg-white/70 text-black/70 border border-black/15', 
          icon: AlertCircle,
          label: 'Pending Review'
        }
      case 'confirmed': 
        return { 
          color: 'bg-black text-white border border-black', 
          icon: CheckCircle,
          label: 'Confirmed'
        }
      case 'cancelled': 
        return { 
          color: 'bg-white/40 text-black/50 border border-black/15', 
          icon: XCircle,
          label: 'Cancelled'
        }
      case 'completed': 
        return { 
          color: 'bg-white/60 text-black/70 border border-black/15', 
          icon: CheckCircle,
          label: 'Completed'
        }
      case 'no_show':
        return {
          color: 'bg-white/40 text-black/50 border border-black/15',
          icon: XCircle,
          label: 'No Show'
        }
      case 'reschedule_pending':
        return { color: 'bg-amber-100 text-amber-700 border border-amber-200', icon: RefreshCw, label: 'Reschedule Proposed' }
      case 'awaiting_confirmation':
        return { color: 'bg-blue-100 text-blue-700 border border-blue-200', icon: AlertCircle, label: 'Confirm Session' }
      case 'disputed':
        return { color: 'bg-red-100 text-red-700 border border-red-200', icon: ShieldAlert, label: 'Disputed' }
      case 'under_investigation':
        return { color: 'bg-red-100 text-red-700 border border-red-200', icon: ShieldAlert, label: 'Under Investigation' }
      default:
        return { 
          color: 'bg-white/60 text-black/60 border border-black/15', 
          icon: AlertCircle,
          label: status
        }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'all') return true
    if (filter === 'pending') return apt.status === 'pending'
    if (filter === 'confirmed') return apt.status === 'confirmed'
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
        <Sidebar />
        <div className="flex-1 w-full flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl px-10 py-12 text-center">
            <div className="w-12 h-12 border border-black/20 border-t-black rounded-full animate-spin mx-auto mb-6" />
            <p className="text-black/70 font-medium tracking-wide">Loading appointments...</p>
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
          className="mb-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-3">Appointments</p>
            <h1 className="text-4xl font-heading font-bold text-black mb-2">My Appointments</h1>
            <p className="text-black/60">
              Keep track of upcoming sessions and review past bookings in one place.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/book-appointment')} className="px-6">
              <Plus className="w-4 h-4 mr-2" /> Book
            </Button>
            <InfoDialogButton
              title="Appointment Planner"
              description="See every session you have booked and what to do next."
              points={[
                'Filter appointments by status to focus on pending or confirmed sessions.',
                'Each card shows the professional’s details, timing, and duration.',
                'Use the cancel option on pending requests if plans change.',
              ]}
            />
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {(['all', 'pending', 'confirmed'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f} ({appointments.filter(a => f === 'all' || a.status === f).length})
            </Button>
          ))}
        </div>

        {filteredAppointments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-16 text-center"
          >
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-black/15 bg-white/80 text-xs tracking-[0.3em] text-black">
              NONE
            </div>
            <h3 className="text-xl font-semibold text-black mb-3">No {filter !== 'all' && filter} appointments</h3>
            <p className="text-black/60 mb-6">
              {filter === 'all'
                ? "You haven't booked any appointments yet. Start by finding an expert!"
                : `You don't have any ${filter} appointments.`}
            </p>
            <Button onClick={() => navigate('/book-appointment')} className="px-6">
              <Plus className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-5">
            {filteredAppointments.map((appointment, index) => {
              const statusConfig = getStatusConfig(appointment.status)
              const StatusIcon = statusConfig.icon

              return (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative overflow-hidden rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-6 transition-all hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition pointer-events-none" />

                  <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 rounded-2xl overflow-hidden border border-black/15 bg-white/80">
                        <img
                          src={appointment.professional.profile_picture_url || DEFAULT_AVATAR}
                          alt={appointment.professional.full_name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-black/50 mb-1">Professional</p>
                        <h3 className="text-xl font-semibold text-black">{appointment.professional.full_name}</h3>
                        <p className="text-sm text-black/60">
                          {appointment.professional.professional_profiles?.professional_title || 'Specialist'}
                        </p>
                      </div>
                    </div>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.3em] ${statusConfig.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      {statusConfig.label}
                    </div>
                  </div>

                  <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-4 flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-black" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-black/40 mb-1">Date</p>
                        <p className="text-sm font-semibold text-black">
                          {appointment.status === 'confirmed' && appointment.confirmed_date
                            ? formatDate(appointment.confirmed_date)
                            : formatDate(appointment.requested_date)}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-4 flex items-center gap-3">
                      <Clock className="w-5 h-5 text-black" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-black/40 mb-1">Time</p>
                        <p className="text-sm font-semibold text-black">
                          {appointment.status === 'confirmed' && appointment.confirmed_time
                            ? formatTime(appointment.confirmed_time)
                            : formatTime(appointment.requested_time)}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-4 flex items-center gap-3">
                      <MessageCircle className="w-5 h-5 text-black" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-black/40 mb-1">Duration</p>
                        <p className="text-sm font-semibold text-black">{appointment.duration_minutes} minutes</p>
                      </div>
                    </div>
                  </div>

                  {appointment.patient_message && (
                    <div className="mb-4">
                      <h4 className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">Your Message</h4>
                      <p className="text-sm text-black/70 leading-relaxed rounded-2xl border border-black/10 bg-white/70 p-4">
                        {appointment.patient_message}
                      </p>
                    </div>
                  )}

                  {appointment.professional_response && (
                    <div className="mb-4">
                      <h4 className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">Professional Response</h4>
                      <p className="text-sm text-black/70 leading-relaxed rounded-2xl border border-black/10 bg-white/70 p-4">
                        {appointment.professional_response}
                      </p>
                    </div>
                  )}

                  {/* Reschedule proposal banner */}
                  {appointment.status === 'reschedule_pending' && appointment.proposed_date && (
                    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-800">New time proposed</p>
                      <p className="text-sm text-amber-700 mt-1">
                        {formatDate(appointment.proposed_date)} at {appointment.proposed_time && formatTime(appointment.proposed_time)}
                        {appointment.reschedule_reason ? ` — ${appointment.reschedule_reason}` : ''}
                      </p>
                      {(appointment.reschedule_count || 0) > 3 && (
                        <p className="text-xs text-red-600 mt-2">
                          This expert has rescheduled {appointment.reschedule_count} times. You can decline and receive a full refund.
                        </p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={() => handleReschedule(appointment.id, 'accept')} disabled={busyId === appointment.id}>Accept new time</Button>
                        <Button size="sm" variant="outline" onClick={() => handleReschedule(appointment.id, 'reject')} disabled={busyId === appointment.id}>Decline + refund</Button>
                      </div>
                    </div>
                  )}

                  {/* Online session join + safety button */}
                  {appointment.status === 'confirmed' && appointment.session_type === 'online' && (
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      {appointment.meeting_link ? (
                        <a href={appointment.meeting_link} target="_blank" rel="noreferrer">
                          <Button size="sm"><Video className="w-4 h-4 mr-2" /> Join {appointment.online_platform === 'zoom' ? 'Zoom' : 'Google Meet'}</Button>
                        </a>
                      ) : (
                        <span className="text-xs text-black/50">Meeting link not added yet</span>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleSafetyConcern(appointment.id)} className="border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white">
                        <ShieldAlert className="w-4 h-4 mr-2" /> Report Safety Concern
                      </Button>
                    </div>
                  )}

                  {/* Offline session location (no Join / safety button — those are online-only) */}
                  {appointment.status === 'confirmed' && appointment.session_type === 'offline' && (
                    <div className="mb-4 rounded-2xl border border-black/10 bg-white/70 p-4 flex items-start gap-2 text-sm text-black/70">
                      <MapPin className="w-4 h-4 mt-0.5 text-black" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-black/40 mb-1">Location</p>
                        {appointment.location || 'The expert has not added a location yet.'}
                      </div>
                    </div>
                  )}

                  {/* Session summary (after completion) */}
                  {appointment.session_summary && (
                    <div className="mb-4">
                      <h4 className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">Session Summary</h4>
                      <p className="text-sm text-black/70 leading-relaxed rounded-2xl border border-black/10 bg-white/70 p-4">{appointment.session_summary}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-4 border-t border-black/10">
                    <div className="text-xs text-black/50 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <span>Requested {new Date(appointment.created_at).toLocaleDateString('en-GB')}</span>
                      <span>
                        Fee <strong>{formatPence(appointment.amount_pence) !== '—' ? formatPence(appointment.amount_pence) : (appointment.professional.professional_profiles?.appointment_fee ? `£${appointment.professional.professional_profiles.appointment_fee}` : '—')}</strong>
                      </span>
                      {(() => {
                        const payout = getPayoutStatus(appointment.payment_status, appointment.status)
                        return (
                          <span className="inline-flex items-center gap-1.5">
                            Payment
                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${PAYOUT_TONE_CLASSES[payout.tone]}`}>
                              {payout.label}
                            </span>
                          </span>
                        )
                      })()}
                    </div>

                    {(() => {
                      const canConfirm =
                        ['confirmed', 'awaiting_confirmation'].includes(appointment.status) &&
                        !appointment.worker_confirmed_at &&
                        (IS_MOCK_PAYMENTS || sessionHasEnded(appointment))
                      const waitingForExpert =
                        !!appointment.worker_confirmed_at && appointment.status !== 'completed'
                      return (
                        <div className="flex flex-wrap items-center gap-2">
                          {canConfirm && (
                            <>
                              <Button size="sm" onClick={() => handleConfirmSession(appointment.id)} disabled={busyId === appointment.id}>
                                <CheckCircle className="w-4 h-4 mr-2" /> Confirm Session
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleReportIssue(appointment.id)} disabled={busyId === appointment.id} className="border border-black/15 bg-white/70">
                                Report Issue
                              </Button>
                            </>
                          )}
                          {waitingForExpert && (
                            <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
                              ✓ You confirmed — waiting for the expert to complete the session
                            </span>
                          )}
                          {(appointment.status === 'pending' || appointment.status === 'confirmed') && !appointment.worker_confirmed_at && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(appointment.id)}
                              disabled={busyId === appointment.id}
                              className="border border-black/15 bg-white/70 hover:bg-black hover:text-white"
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Cancel
                            </Button>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
