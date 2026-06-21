import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Check, X, Phone, Mail, Calendar as CalendarIcon, Clock as ClockIcon, Video, MapPin, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Sidebar from '@/components/Sidebar'
import { InfoDialogButton } from '@/components/InfoDialog'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  expertDecision,
  completeSession,
  formatPence,
  sessionHasEnded,
  IS_MOCK_PAYMENTS,
  PAYMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from '@/lib/payments'

interface AppointmentRequest {
  id: string
  patient_id: string
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
  expert_payout_pence?: number
  worker_confirmed_at?: string
  session_summary?: string
  patient_message?: string
  patient_phone?: string
  patient_email?: string
  patient_preferred_contact?: string
  patient_concerns?: string
  patient_goals?: string
  patient_previous_therapy?: boolean
  patient_previous_therapy_details?: string
  patient_medications?: string
  patient_emergency_contact_name?: string
  patient_emergency_contact_phone?: string
  patient_insurance_info?: string
  patient_consent_given?: boolean
  professional_notes?: string
  professional_response?: string
  confirmed_date?: string
  confirmed_time?: string
  created_at: string
  updated_at: string
  patient: {
    full_name: string
    email: string
    phone_number: string
    profile_picture_url?: string
  }
}

export default function AppointmentInboxPage() {
  const { userProfile } = useAuth()
  const [appointments, setAppointments] = useState<AppointmentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRequest | null>(null)
  const [professionalResponse, setProfessionalResponse] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('pending')

  // Accept / reschedule / complete inputs
  const [meetingLink, setMeetingLink] = useState('')
  const [location, setLocation] = useState('')
  const [proposedDate, setProposedDate] = useState('')
  const [proposedTime, setProposedTime] = useState('')
  const [summary, setSummary] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [actualDuration, setActualDuration] = useState('')

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
        .eq('professional_id', userProfile.id)
        .order('created_at', { ascending: false })

      if (requestsError) throw requestsError

      if (!requestsData || requestsData.length === 0) {
        setAppointments([])
        setLoading(false)
        return
      }

      // Get unique patient IDs
      const patientIds = [...new Set(requestsData.map(r => r.patient_id))]

      // Fetch patient details
      const { data: patientsData, error: patientsError } = await supabase
        .from('users')
        .select('id, full_name, email, phone_number, profile_picture_url')
        .in('id', patientIds)

      if (patientsError) throw patientsError

      // Combine data
      const combinedData = requestsData.map(request => {
        const patient = patientsData?.find(p => p.id === request.patient_id)
        return {
          ...request,
          patient: patient || {
            full_name: 'Unknown Patient',
            email: '',
            phone_number: '',
            profile_picture_url: null
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

  const resetForms = () => {
    setSelectedAppointment(null)
    setProfessionalResponse('')
    setMeetingLink('')
    setLocation('')
    setProposedDate('')
    setProposedTime('')
    setSummary('')
    setSessionNotes('')
    setActualDuration('')
  }

  const handleAccept = async () => {
    if (!selectedAppointment) return
    if (selectedAppointment.session_type === 'online' && !meetingLink && !selectedAppointment.meeting_link) {
      toast.error('Add a meeting link for online sessions')
      return
    }
    if (selectedAppointment.session_type === 'offline' && !location && !selectedAppointment.location) {
      toast.error('Add a location/address for offline sessions')
      return
    }
    setActionLoading(true)
    try {
      await expertDecision({
        appointmentId: selectedAppointment.id,
        decision: 'accept',
        meetingLink: meetingLink || undefined,
        location: location || undefined,
        response: professionalResponse || undefined,
      })
      toast.success('✅ Appointment confirmed', { description: 'The patient has been notified.' })
      resetForms()
      fetchAppointments()
    } catch (e: any) {
      toast.error('Failed to confirm', { description: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedAppointment) return
    setActionLoading(true)
    try {
      await expertDecision({
        appointmentId: selectedAppointment.id,
        decision: 'reject',
        response: professionalResponse || undefined,
      })
      toast.success('Appointment successfully cancelled')
      resetForms()
      fetchAppointments()
    } catch (e: any) {
      toast.error('Failed to decline', { description: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReschedule = async () => {
    if (!selectedAppointment) return
    if (!proposedDate || !proposedTime) {
      toast.error('Pick a new date and time to propose')
      return
    }
    setActionLoading(true)
    try {
      await expertDecision({
        appointmentId: selectedAppointment.id,
        decision: 'reschedule',
        proposedDate,
        proposedTime,
        reason: professionalResponse || undefined,
      })
      toast.success('Reschedule proposed', { description: 'The patient will accept or decline the new time.' })
      resetForms()
      fetchAppointments()
    } catch (e: any) {
      toast.error('Failed to reschedule', { description: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!selectedAppointment) return
    if (!summary.trim() || !sessionNotes.trim() || !actualDuration) {
      toast.error('Summary, notes and duration are all required')
      return
    }
    setActionLoading(true)
    try {
      await completeSession({
        appointmentId: selectedAppointment.id,
        sessionSummary: summary,
        sessionNotes,
        durationMinutes: Number(actualDuration),
      })
      toast.success('Session marked complete', { description: 'Payout releases after the patient confirms (or in 72h).' })
      resetForms()
      fetchAppointments()
    } catch (e: any) {
      toast.error('Failed to complete session', { description: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-white/70 text-black/70 border border-black/15'
      case 'confirmed':
        return 'bg-black text-white border border-black'
      case 'cancelled':
        return 'bg-white/40 text-black/50 border border-black/15'
      case 'completed':
        return 'bg-white/70 text-black/70 border border-black/15'
      case 'no_show':
        return 'bg-white/40 text-black/50 border border-black/15'
      default:
        return 'bg-white/60 text-black/60 border border-black/15'
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
            <div className="w-10 h-10 border border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4" />
            <p className="text-black/70">Loading appointments...</p>
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
            <h1 className="text-4xl font-heading font-bold text-black mb-2">
              Appointment Inbox
            </h1>
            <p className="text-muted-foreground">
              Review and respond to patient appointment requests
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(['all', 'pending', 'confirmed'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                className="capitalize px-6"
              >
                {f} ({appointments.filter(a => f === 'all' || a.status === f).length})
              </Button>
            ))}
            <InfoDialogButton
              title="Appointment Inbox"
              description="Monitor and respond to booking requests from patients."
              points={[
                'Use the filters to focus on pending or confirmed requests.',
                'Selecting a card shows complete patient details and notes.',
                'Confirm or decline bookings with prepared response fields.',
              ]}
              triggerClassName="hidden xl:inline-flex"
            />
          </div>
        </motion.div>

        <div>
          <div className="space-y-4">
            {filteredAppointments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-12 text-center"
              >
                <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-black/15 bg-white/80 text-xs tracking-[0.3em] font-semibold text-black">
                  NONE
                </div>
                <h3 className="text-lg font-semibold mb-2 text-black">No {filter !== 'all' && filter} appointments</h3>
                <p className="text-black/60">
                  {filter === 'pending'
                    ? "You're all caught up! No pending requests right now."
                    : "When patients request appointments, they'll appear here."}
                </p>
              </motion.div>
            ) : (
              filteredAppointments.map((appointment, index) => (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative overflow-hidden rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-6 transition-all hover:-translate-y-1 hover:shadow-2xl ${
                    selectedAppointment?.id === appointment.id ? 'ring-2 ring-black' : ''
                  }`}
                  onClick={() => setSelectedAppointment(appointment)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl overflow-hidden border border-black/10 bg-white/80">
                        {appointment.patient.profile_picture_url ? (
                          <img
                            src={appointment.patient.profile_picture_url}
                            alt={appointment.patient.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold tracking-[0.3em] text-black">
                            {appointment.patient.full_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-black/40">Patient</p>
                        <h3 className="font-semibold text-lg text-black">{appointment.patient.full_name}</h3>
                        <p className="text-sm text-black/60 flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          {appointment.patient.email}
                        </p>
                      </div>
                    </div>
                    <span className={`${getStatusColor(appointment.status)} px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.32em]`}> 
                      {appointment.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="relative z-10 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-black/70">
                      <span className="tracking-[0.2em] uppercase text-xs">Date</span>
                      <span>{formatDate(appointment.requested_date)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm text-black/70">
                      <span className="tracking-[0.2em] uppercase text-xs">Time</span>
                      <span>{formatTime(appointment.requested_time)} · {appointment.duration_minutes} min</span>
                    </div>
                  </div>

                  {appointment.patient_message && (
                    <div className="relative z-10 mt-5 rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/70">
                      <p className="text-xs uppercase tracking-[0.32em] text-black/40 mb-2">Message</p>
                      <span className="line-clamp-3 leading-relaxed">{appointment.patient_message}</span>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>

          <Dialog open={!!selectedAppointment} onOpenChange={(open) => { if (!open) resetForms() }}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              {selectedAppointment && (
              <div className="space-y-6">
                <DialogTitle className="sr-only">Appointment Details</DialogTitle>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-black">Appointment Details</h3>
                    <span className="uppercase text-xs tracking-[0.3em] text-black/40">Overview</span>
                  </div>
                  <div className="space-y-3 text-sm text-black/70">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{selectedAppointment.patient.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{selectedAppointment.patient.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{selectedAppointment.patient.phone_number}</span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2 rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/70">
                    <div className="flex justify-between"><span>Status</span><span className="font-medium text-black">{APPOINTMENT_STATUS_LABELS[selectedAppointment.status] || selectedAppointment.status}</span></div>
                    <div className="flex justify-between"><span>Date</span><span>{formatDate(selectedAppointment.requested_date)}</span></div>
                    <div className="flex justify-between"><span>Time</span><span>{formatTime(selectedAppointment.requested_time)}</span></div>
                    <div className="flex justify-between"><span>Duration</span><span>{selectedAppointment.duration_minutes} minutes</span></div>
                    <div className="flex justify-between"><span>Session</span><span className="capitalize">{selectedAppointment.session_type || 'online'}{selectedAppointment.online_platform ? ` · ${selectedAppointment.online_platform === 'google_meet' ? 'Google Meet' : 'Zoom'}` : ''}</span></div>
                    <div className="flex justify-between"><span>Fee paid</span><span>{formatPence(selectedAppointment.amount_pence)}</span></div>
                    <div className="flex justify-between"><span>Your payout</span><span className="font-medium text-black">{formatPence(selectedAppointment.expert_payout_pence)}</span></div>
                    {selectedAppointment.payment_status && (
                      <div className="flex justify-between"><span>Payment</span><span className="font-medium text-black">{PAYMENT_STATUS_LABELS[selectedAppointment.payment_status] || selectedAppointment.payment_status}</span></div>
                    )}
                  </div>

                  {selectedAppointment.patient_message && (
                    <div className="mt-6">
                      <h4 className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">Patient Message</h4>
                      <p className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/70 leading-relaxed">
                        {selectedAppointment.patient_message}
                      </p>
                    </div>
                  )}

                  {selectedAppointment.patient_concerns && (
                    <div className="mt-4">
                      <h4 className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">Concerns</h4>
                      <p className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/70 leading-relaxed">
                        {selectedAppointment.patient_concerns}
                      </p>
                    </div>
                  )}

                  {selectedAppointment.patient_goals && (
                    <div className="mt-4">
                      <h4 className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">Goals</h4>
                      <p className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/70 leading-relaxed">
                        {selectedAppointment.patient_goals}
                      </p>
                    </div>
                  )}
                </div>

                {/* PENDING (paid) → accept / decline / reschedule */}
                {selectedAppointment.status === 'pending' && (
                  selectedAppointment.payment_status !== 'paid_held' ? (
                    <div className="relative z-10 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      Awaiting payment — this request becomes actionable once the patient's payment is confirmed.
                    </div>
                  ) : (
                  <div className="relative z-10 space-y-4">
                    {selectedAppointment.session_type === 'online' ? (
                      <div>
                        <Label htmlFor="meetingLink" className="flex items-center gap-2"><Video className="w-4 h-4" /> Meeting Link</Label>
                        <Input
                          id="meetingLink"
                          value={meetingLink}
                          onChange={(e) => setMeetingLink(e.target.value)}
                          placeholder={`Paste your ${selectedAppointment.online_platform === 'zoom' ? 'Zoom' : 'Google Meet'} link`}
                          className="mt-2 border-black/15"
                        />
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="location" className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Location / Address</Label>
                        <Input
                          id="location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Clinic name and full address for the in-person session"
                          className="mt-2 border-black/15"
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="response">Message to Patient (optional)</Label>
                      <Textarea
                        id="response"
                        value={professionalResponse}
                        onChange={(e) => setProfessionalResponse(e.target.value)}
                        placeholder="Add a message, or a reason if rescheduling..."
                        className="mt-2 border-black/15"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleAccept} disabled={actionLoading} className="flex-1">
                        {actionLoading ? (
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Accept
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleReject}
                        disabled={actionLoading}
                        className="flex-1 border border-black/15 bg-white/70 hover:bg-black hover:text-white"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Decline + Refund
                      </Button>
                    </div>

                    {/* Reschedule proposal */}
                    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 space-y-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-black/40 flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Propose new time</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" value={proposedDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setProposedDate(e.target.value)} className="border-black/15" />
                        <Input type="time" value={proposedTime} onChange={(e) => setProposedTime(e.target.value)} className="border-black/15" />
                      </div>
                      <Button variant="outline" onClick={handleReschedule} disabled={actionLoading} className="w-full">
                        Send reschedule request
                      </Button>
                    </div>
                  </div>
                  )
                )}

                {/* CONFIRMED → add/update link + mark complete */}
                {selectedAppointment.status === 'confirmed' && (
                  <div className="relative z-10 space-y-4">
                    {selectedAppointment.session_type === 'online' && (
                      <div>
                        <Label htmlFor="link2" className="flex items-center gap-2"><Video className="w-4 h-4" /> Meeting Link</Label>
                        <Input
                          id="link2"
                          value={meetingLink || selectedAppointment.meeting_link || ''}
                          onChange={(e) => setMeetingLink(e.target.value)}
                          placeholder="Meeting link"
                          className="mt-2 border-black/15"
                        />
                      </div>
                    )}
                    {/* Reschedule (allowed any number of times) */}
                    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 space-y-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-black/40 flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Reschedule</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" value={proposedDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setProposedDate(e.target.value)} className="border-black/15" />
                        <Input type="time" value={proposedTime} onChange={(e) => setProposedTime(e.target.value)} className="border-black/15" />
                      </div>
                      <Input value={professionalResponse} onChange={(e) => setProfessionalResponse(e.target.value)} placeholder="Reason (optional)" className="border-black/15" />
                      <Button variant="outline" onClick={handleReschedule} disabled={actionLoading} className="w-full">
                        Propose new time
                      </Button>
                    </div>

                    {!IS_MOCK_PAYMENTS && !sessionHasEnded(selectedAppointment) ? (
                      <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/60 flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" />
                        You can mark this session complete once it has ended
                        (after {formatDate(selectedAppointment.confirmed_date || selectedAppointment.requested_date)} {formatTime(selectedAppointment.confirmed_time || selectedAppointment.requested_time)}).
                      </div>
                    ) : (
                    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 space-y-3">
                      <p className="text-sm font-semibold text-black flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Mark session complete{IS_MOCK_PAYMENTS && ' (simulation)'}</p>
                      {selectedAppointment.worker_confirmed_at && (
                        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          ✓ The worker has already confirmed — completing now will release your payout.
                        </p>
                      )}
                      <div>
                        <Label htmlFor="summary">Session Summary</Label>
                        <Textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief summary of the session" className="mt-1 border-black/15" rows={2} />
                      </div>
                      <div>
                        <Label htmlFor="snotes">Session Notes</Label>
                        <Textarea id="snotes" value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} placeholder="Detailed notes" className="mt-1 border-black/15" rows={3} />
                      </div>
                      <div>
                        <Label htmlFor="dur">Duration (minutes)</Label>
                        <Input id="dur" type="number" value={actualDuration} onChange={(e) => setActualDuration(e.target.value)} placeholder={`${selectedAppointment.duration_minutes}`} className="mt-1 border-black/15" />
                      </div>
                      <Button onClick={handleComplete} disabled={actionLoading} className="w-full">
                        {actionLoading ? 'Submitting…' : 'Complete Session'}
                      </Button>
                    </div>
                    )}
                  </div>
                )}

                {/* AWAITING CONFIRMATION / terminal states */}
                {selectedAppointment.status === 'awaiting_confirmation' && (
                  <div className="relative z-10 rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/70">
                    Session completed. Waiting for the patient to confirm — payout releases automatically after 72 hours if there's no dispute.
                  </div>
                )}
                {(selectedAppointment.status === 'disputed' || selectedAppointment.status === 'under_investigation') && (
                  <div className="relative z-10 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    This appointment is {selectedAppointment.status === 'under_investigation' ? 'under safety investigation' : 'in dispute'}. Payout is on hold pending admin resolution.
                  </div>
                )}

                {selectedAppointment.professional_response && (
                  <div className="relative z-10">
                    <h4 className="text-xs uppercase tracking-[0.3em] text-black/40 mb-2">Your Response</h4>
                    <p className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/70 leading-relaxed">
                      {selectedAppointment.professional_response}
                    </p>
                  </div>
                )}
              </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
