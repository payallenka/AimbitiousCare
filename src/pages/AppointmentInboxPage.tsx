import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Check, X, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Sidebar from '@/components/Sidebar'
import { InfoDialogButton } from '@/components/InfoDialog'

interface AppointmentRequest {
  id: string
  patient_id: string
  professional_id: string
  requested_date: string
  requested_time: string
  duration_minutes: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
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
  const [professionalNotes, setProfessionalNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('pending')

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

  const handleAppointmentAction = async (appointmentId: string, action: 'confirm' | 'cancel') => {
    if (!userProfile) return

    setActionLoading(true)
    try {
      const updateData: any = {
        status: action === 'confirm' ? 'confirmed' : 'cancelled',
        professional_response: professionalResponse || null,
        professional_notes: professionalNotes || null
      }

      if (action === 'confirm' && selectedAppointment) {
        updateData.confirmed_date = selectedAppointment.requested_date
        updateData.confirmed_time = selectedAppointment.requested_time
      }

      const { error } = await supabase
        .from('appointment_requests')
        .update(updateData)
        .eq('id', appointmentId)

      if (error) throw error

      toast.success(`✅ Appointment ${action === 'confirm' ? 'confirmed' : 'declined'}!`, {
        description: action === 'confirm' 
          ? 'Patient will be notified of the confirmation'
          : 'Patient will be notified of the cancellation'
      })
      setSelectedAppointment(null)
      setProfessionalResponse('')
      setProfessionalNotes('')
      fetchAppointments()
    } catch (error: any) {
      console.error(`Error ${action}ing appointment:`, error)
      toast.error(`Failed to ${action} appointment`, {
        description: error.message
      })
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
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

          <div className="lg:col-span-1">
            {selectedAppointment ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-6 space-y-6"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
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
                    <div className="flex justify-between"><span>Date</span><span>{formatDate(selectedAppointment.requested_date)}</span></div>
                    <div className="flex justify-between"><span>Time</span><span>{formatTime(selectedAppointment.requested_time)}</span></div>
                    <div className="flex justify-between"><span>Duration</span><span>{selectedAppointment.duration_minutes} minutes</span></div>
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

                {selectedAppointment.status === 'pending' && (
                  <div className="relative z-10 space-y-4">
                    <div>
                      <Label htmlFor="response">Your Response</Label>
                      <Textarea
                        id="response"
                        value={professionalResponse}
                        onChange={(e) => setProfessionalResponse(e.target.value)}
                        placeholder="Add a message for the patient..."
                        className="mt-2 border-black/15"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Internal Notes (Private)</Label>
                      <Textarea
                        id="notes"
                        value={professionalNotes}
                        onChange={(e) => setProfessionalNotes(e.target.value)}
                        placeholder="Private notes not shared with patient..."
                        className="mt-2 border-black/15"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAppointmentAction(selectedAppointment.id, 'confirm')}
                        disabled={actionLoading}
                        className="flex-1"
                      >
                        {actionLoading ? (
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleAppointmentAction(selectedAppointment.id, 'cancel')}
                        disabled={actionLoading}
                        className="flex-1 border border-black/15 bg-white/70 hover:bg-black hover:text-white"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Decline
                      </Button>
                    </div>
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
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-10 text-center"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-black/40 mb-3">Details</p>
                <h3 className="text-lg font-semibold mb-2 text-black">Select an appointment</h3>
                <p className="text-sm text-black/60">
                  Click on an appointment request to view details and respond
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
