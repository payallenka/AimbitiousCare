import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, MessageCircle, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Sidebar from '@/components/Sidebar'
import { InfoDialogButton } from '@/components/InfoDialog'
import { useNavigate } from 'react-router-dom'

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" fill="%23f5f5dc"/%3E%3Ccircle cx="32" cy="24" r="12" fill="%23000"/%3E%3Cpath fill="%23000" d="M16 54c0-8.8 7.2-16 16-16s16 7.2 16 16z"/%3E%3C/svg%3E'

interface AppointmentRequest {
  id: string
  professional_id: string
  requested_date: string
  requested_time: string
  duration_minutes: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  patient_message?: string
  professional_response?: string
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

  const cancelAppointment = async (appointmentId: string) => {
    if (!userProfile) return

    try {
      const { error } = await supabase
        .from('appointment_requests')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)
        .eq('patient_id', userProfile.id)

      if (error) throw error

      toast.success('Appointment cancelled')
      fetchAppointments()
    } catch (error: any) {
      console.error('Error cancelling appointment:', error)
      toast.error('Failed to cancel appointment')
    }
  }

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
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition" />

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

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-4 border-t border-black/10">
                    <div className="text-xs text-black/50">
                      Requested {new Date(appointment.created_at).toLocaleDateString('en-GB')}
                      {appointment.professional.professional_profiles?.appointment_fee && (
                        <span className="ml-4">
                          Fee <strong>£{appointment.professional.professional_profiles.appointment_fee}</strong>
                        </span>
                      )}
                    </div>

                    {appointment.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelAppointment(appointment.id)}
                        className="border border-black/15 bg-white/70 hover:bg-black hover:text-white"
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Cancel Request
                      </Button>
                    )}
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
