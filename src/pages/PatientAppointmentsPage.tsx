import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, User, MessageCircle, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Navbar from '@/components/Navbar'
import { useNavigate } from 'react-router-dom'

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

      toast.success('✅ Appointment cancelled')
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
          color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', 
          icon: AlertCircle,
          label: 'Pending Review'
        }
      case 'confirmed': 
        return { 
          color: 'bg-green-500/10 text-green-600 border-green-500/20', 
          icon: CheckCircle,
          label: 'Confirmed'
        }
      case 'cancelled': 
        return { 
          color: 'bg-red-500/10 text-red-600 border-red-500/20', 
          icon: XCircle,
          label: 'Cancelled'
        }
      case 'completed': 
        return { 
          color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', 
          icon: CheckCircle,
          label: 'Completed'
        }
      case 'no_show': 
        return { 
          color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', 
          icon: XCircle,
          label: 'No Show'
        }
      default: 
        return { 
          color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', 
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
      
      <div className="max-w-5xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-heading font-bold gradient-text mb-3">
                📅 My Appointments
              </h1>
              <p className="text-muted-foreground text-lg">
                View and manage your scheduled appointments
              </p>
            </div>
            <Button
              onClick={() => navigate('/book-appointment')}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Book New
            </Button>
          </div>
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

        {filteredAppointments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-12 text-center"
          >
            <Calendar className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No {filter !== 'all' && filter} appointments</h3>
            <p className="text-muted-foreground mb-6">
              {filter === 'all' 
                ? "You haven't booked any appointments yet. Start by finding an expert!"
                : `You don't have any ${filter} appointments.`}
            </p>
            <Button onClick={() => navigate('/book-appointment')}>
              <Plus className="w-4 h-4 mr-2" />
              Book Your First Appointment
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment, index) => {
              const statusConfig = getStatusConfig(appointment.status)
              const StatusIcon = statusConfig.icon

              return (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card rounded-2xl p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        {appointment.professional.profile_picture_url ? (
                          <img
                            src={appointment.professional.profile_picture_url}
                            alt={appointment.professional.full_name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-xl">{appointment.professional.full_name}</h3>
                        <p className="text-primary font-medium">
                          {appointment.professional.professional_profiles?.professional_title || 'Professional'}
                        </p>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-medium border flex items-center gap-2 ${statusConfig.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      {statusConfig.label}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-xl">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium text-sm">
                          {appointment.status === 'confirmed' && appointment.confirmed_date
                            ? formatDate(appointment.confirmed_date)
                            : formatDate(appointment.requested_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-accent/5 p-4 rounded-xl">
                      <Clock className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-xs text-muted-foreground">Time</p>
                        <p className="font-medium text-sm">
                          {appointment.status === 'confirmed' && appointment.confirmed_time
                            ? formatTime(appointment.confirmed_time)
                            : formatTime(appointment.requested_time)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-muted/20 p-4 rounded-xl">
                      <MessageCircle className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-medium text-sm">{appointment.duration_minutes} minutes</p>
                      </div>
                    </div>
                  </div>

                  {appointment.patient_message && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Your Message</h4>
                      <p className="text-sm bg-primary/5 p-4 rounded-xl">{appointment.patient_message}</p>
                    </div>
                  )}

                  {appointment.professional_response && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Professional Response
                      </h4>
                      <p className="text-sm bg-accent/10 p-4 rounded-xl border border-accent/20">{appointment.professional_response}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="text-xs text-muted-foreground">
                      Requested: {new Date(appointment.created_at).toLocaleDateString('en-GB')}
                      {appointment.professional.professional_profiles?.appointment_fee && (
                        <span className="ml-4">
                          Fee: <strong>£{appointment.professional.professional_profiles.appointment_fee}</strong>
                        </span>
                      )}
                    </div>
                    
                    {appointment.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelAppointment(appointment.id)}
                        className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Request
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
