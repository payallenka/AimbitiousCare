import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, User, MessageCircle, Check, X, Eye, Phone, Mail, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Navbar from '@/components/Navbar'

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
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      case 'confirmed': return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20'
      case 'completed': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'no_show': return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
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
      <div className="min-h-screen cosmic-bg">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading appointments...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen cosmic-bg">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-heading font-bold gradient-text mb-3">
            📬 Appointment Inbox
          </h1>
          <p className="text-muted-foreground text-lg">
            Review and respond to patient appointment requests
          </p>
        </motion.div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Appointments List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredAppointments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card rounded-2xl p-12 text-center"
              >
                <Calendar className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No {filter !== 'all' && filter} appointments</h3>
                <p className="text-muted-foreground">
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
                  className={`glass-card rounded-2xl p-6 cursor-pointer transition-all hover:shadow-lg ${
                    selectedAppointment?.id === appointment.id ? 'ring-2 ring-primary shadow-xl' : ''
                  }`}
                  onClick={() => setSelectedAppointment(appointment)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        {appointment.patient.profile_picture_url ? (
                          <img
                            src={appointment.patient.profile_picture_url}
                            alt={appointment.patient.full_name}
                            className="w-14 h-14 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-7 h-7 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{appointment.patient.full_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {appointment.patient.email}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm bg-primary/5 p-3 rounded-lg">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{formatDate(appointment.requested_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm bg-accent/5 p-3 rounded-lg">
                      <Clock className="w-4 h-4 text-accent" />
                      <span>{formatTime(appointment.requested_time)} ({appointment.duration_minutes}min)</span>
                    </div>
                  </div>

                  {appointment.patient_message && (
                    <div className="flex items-start gap-2 text-sm bg-muted/20 p-3 rounded-lg">
                      <MessageCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{appointment.patient_message}</span>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>

          {/* Appointment Details */}
          <div className="lg:col-span-1">
            {selectedAppointment ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card rounded-2xl p-6 sticky top-6 space-y-6"
              >
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Appointment Details
                  </h3>
                  
                  {/* Patient Info */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{selectedAppointment.patient.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedAppointment.patient.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedAppointment.patient.phone_number}</span>
                    </div>
                  </div>

                  {/* Appointment Info */}
                  <div className="space-y-2 mb-6 p-4 bg-primary/5 rounded-lg">
                    <div><strong>Date:</strong> {formatDate(selectedAppointment.requested_date)}</div>
                    <div><strong>Time:</strong> {formatTime(selectedAppointment.requested_time)}</div>
                    <div><strong>Duration:</strong> {selectedAppointment.duration_minutes} minutes</div>
                  </div>

                  {/* Patient Details */}
                  {selectedAppointment.patient_message && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Patient Message</h4>
                      <p className="text-sm bg-muted/20 p-3 rounded-lg">{selectedAppointment.patient_message}</p>
                    </div>
                  )}

                  {selectedAppointment.patient_concerns && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Concerns</h4>
                      <p className="text-sm bg-muted/20 p-3 rounded-lg">{selectedAppointment.patient_concerns}</p>
                    </div>
                  )}

                  {selectedAppointment.patient_goals && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Goals</h4>
                      <p className="text-sm bg-muted/20 p-3 rounded-lg">{selectedAppointment.patient_goals}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {selectedAppointment.status === 'pending' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="response">Your Response</Label>
                      <Textarea
                        id="response"
                        value={professionalResponse}
                        onChange={(e) => setProfessionalResponse(e.target.value)}
                        placeholder="Add a message for the patient..."
                        className="mt-1"
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
                        className="mt-1"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAppointmentAction(selectedAppointment.id, 'confirm')}
                        disabled={actionLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Confirm
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleAppointmentAction(selectedAppointment.id, 'cancel')}
                        disabled={actionLoading}
                        className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-white"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  </div>
                )}

                {selectedAppointment.professional_response && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Your Response</h4>
                    <p className="text-sm bg-accent/10 p-3 rounded-lg">{selectedAppointment.professional_response}</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card rounded-2xl p-12 text-center"
              >
                <Eye className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select an appointment</h3>
                <p className="text-sm text-muted-foreground">
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
