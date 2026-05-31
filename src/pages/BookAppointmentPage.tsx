import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Send, ArrowLeft, Check, AlertCircle, Calendar as CalendarIcon, Clock as ClockIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Sidebar from '@/components/Sidebar'
import { InfoDialogButton } from '@/components/InfoDialog'

interface Expert {
  id: string
  full_name: string
  email: string
  phone_number: string
  profile_picture_url?: string
  user_role: string
  professional_profiles: {
    professional_title: string
    years_of_experience: number
    areas_of_expertise: string[]
    appointment_fee?: number
    session_duration?: number
  } | null
}

interface AvailabilitySlot {
  day_of_week: string
  start_time: string
  end_time: string
}

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export default function BookAppointmentPage() {
  const { userProfile } = useAuth()
  const [experts, setExperts] = useState<Expert[]>([])
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(1)

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [message, setMessage] = useState('')
  const [concerns, setConcerns] = useState('')
  const [goals, setGoals] = useState('')
  const [consent, setConsent] = useState(false)

  useEffect(() => {
    fetchExperts()
  }, [])

  useEffect(() => {
    if (selectedExpert) {
      fetchAvailability(selectedExpert.id)
    }
  }, [selectedExpert])

  const fetchExperts = async () => {
    try {
      // First get all users who are not patients
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, phone_number, profile_picture_url, user_role')
        .neq('user_role', 'patient')

      if (usersError) throw usersError

      // Then get their professional profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('professional_profiles')
        .select('user_id, professional_title, years_of_experience, areas_of_expertise, appointment_fee, session_duration')

      if (profilesError) throw profilesError

      // Combine the data
      const combinedData = usersData
        .map(user => {
          const profile = profilesData.find(p => p.user_id === user.id)
          if (!profile) return null
          
          return {
            ...user,
            professional_profiles: {
              professional_title: profile.professional_title,
              years_of_experience: profile.years_of_experience,
              areas_of_expertise: Array.isArray(profile.areas_of_expertise) ? profile.areas_of_expertise : [],
              appointment_fee: profile.appointment_fee,
              session_duration: profile.session_duration
            }
          }
        })
        .filter(Boolean) as Expert[]

      setExperts(combinedData)
      
      if (combinedData.length === 0) {
        toast.info('No experts available yet', {
          description: 'Please check back later'
        })
      }
    } catch (error: any) {
      console.error('Error fetching experts:', error)
      toast.error('Failed to load experts')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailability = async (expertId: string) => {
    try {
      const { data, error } = await supabase
        .from('professional_availability')
        .select('day_of_week, start_time, end_time')
        .eq('professional_id', expertId)
        .eq('is_active', true)

      if (error) throw error
      setAvailability(data || [])
      
      if (!data || data.length === 0) {
        toast.info('Expert has no availability set yet', {
          description: 'Please choose another expert or check back later'
        })
      }
    } catch (error: any) {
      console.error('Error fetching availability:', error)
      toast.error('Failed to load availability')
    }
  }

  const getAvailableTimesForDate = (date: string): string[] => {
    if (!date || !availability.length) return []
    
    const dateObj = new Date(date + 'T00:00:00')
    const dayName = DAYS_OF_WEEK[dateObj.getDay()]
    
    const daySlots = availability.filter(slot => slot.day_of_week === dayName)
    
    if (!daySlots.length) return []
    
    const times: string[] = []
    daySlots.forEach(slot => {
      const start = new Date(`2000-01-01T${slot.start_time}`)
      const end = new Date(`2000-01-01T${slot.end_time}`)
      
      let current = new Date(start)
      while (current < end) {
        times.push(current.toTimeString().slice(0, 5))
        current.setMinutes(current.getMinutes() + 30)
      }
    })
    
    return [...new Set(times)].sort()
  }

  const handleSubmit = async () => {
    if (!userProfile || !selectedExpert || !selectedDate || !selectedTime) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!consent) {
      toast.error('Please provide your consent to proceed')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('appointment_requests')
        .insert({
          patient_id: userProfile.id,
          professional_id: selectedExpert.id,
          requested_date: selectedDate,
          requested_time: selectedTime,
          duration_minutes: 60,
          patient_message: message || null,
          patient_phone: userProfile.phone_number,
          patient_email: userProfile.email,
          patient_preferred_contact: 'email',
          patient_concerns: concerns || null,
          patient_goals: goals || null,
          patient_consent_given: consent
        })

      if (error) throw error

      toast.success('✅ Appointment request sent!', {
        description: 'The expert will review and respond soon'
      })
      
      // Reset
      setSelectedExpert(null)
      setSelectedDate('')
      setSelectedTime('')
      setMessage('')
      setConcerns('')
      setGoals('')
      setConsent(false)
      setStep(1)
    } catch (error: any) {
      console.error('Error booking appointment:', error)
      toast.error('Failed to book appointment', {
        description: error.message || 'Please try again'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
        <Sidebar />
        <div className="flex-1 w-full flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl px-10 py-12 text-center">
            <div className="w-12 h-12 border border-black/20 border-t-black rounded-full animate-spin mx-auto mb-6" />
            <p className="text-black/70 font-medium tracking-wide">Loading experts...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <Sidebar />

      <div className="flex-1 w-full px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-3">Appointments</p>
            <h1 className="text-4xl font-heading font-bold text-black mb-2">
              Book Your Appointment
            </h1>
            <p className="text-black/60 text-lg">
              Choose an expert and schedule your mental health session
            </p>
          </div>
          <InfoDialogButton
            title="Booking Flow"
            description="Follow the guided steps to request time with a professional."
            points={[
              'Select an expert to review their profile and availability.',
              'Pick a date and time that matches their published schedule.',
              'Share optional notes or goals so the expert can prepare before the call.',
            ]}
          />
        </motion.div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step >= s 
                    ? 'bg-primary text-primary-foreground shadow-lg' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-20 h-1 mx-2 transition-all ${
                    step > s ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between max-w-md mx-auto mt-2">
            <span className="text-xs text-muted-foreground">Select Expert</span>
            <span className="text-xs text-muted-foreground">Pick Date/Time</span>
            <span className="text-xs text-muted-foreground">Confirm Details</span>
          </div>
        </div>

        {/* Step 1: Select Expert */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {experts.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <AlertCircle className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Experts Available</h3>
                <p className="text-muted-foreground">
                  There are no experts with completed profiles yet. Please check back later!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {experts.map((expert) => (
                  <motion.div
                    key={expert.id}
                    whileHover={{ scale: 1.02 }}
                    className={`glass-card rounded-2xl p-6 cursor-pointer transition-all ${
                      selectedExpert?.id === expert.id ? 'ring-2 ring-primary shadow-lg' : ''
                    }`}
                    onClick={() => {
                      setSelectedExpert(expert)
                      setStep(2)
                    }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        {expert.profile_picture_url ? (
                          <img
                            src={expert.profile_picture_url}
                            alt={expert.full_name}
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-10 h-10 text-primary" />
                        )}
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{expert.full_name}</h3>
                      {expert.professional_profiles && (
                        <>
                          <p className="text-primary font-medium text-sm mb-2">
                            {expert.professional_profiles.professional_title}
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            {expert.professional_profiles.years_of_experience} years experience
                          </p>
                          {expert.professional_profiles.areas_of_expertise.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-center mb-3">
                              {expert.professional_profiles.areas_of_expertise.slice(0, 2).map((area, i) => (
                                <span key={i} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                                  {area}
                                </span>
                              ))}
                            </div>
                          )}
                          {expert.professional_profiles.appointment_fee && (
                            <p className="text-sm font-semibold">
                              £{expert.professional_profiles.appointment_fee}/session
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 2 && selectedExpert && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="glass-card rounded-2xl p-8">
              {/* Selected Expert */}
              <div className="flex items-center gap-4 mb-6 p-4 bg-primary/5 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {selectedExpert.profile_picture_url ? (
                    <img
                      src={selectedExpert.profile_picture_url}
                      alt={selectedExpert.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedExpert.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedExpert.professional_profiles?.professional_title || 'Professional'}
                  </p>
                </div>
              </div>

              {/* Date Selection */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="date" className="text-base font-semibold mb-2 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    Select Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value)
                      setSelectedTime('') // Reset time when date changes
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="text-lg mt-2"
                  />
                </div>

                {/* Time Selection */}
                {selectedDate && (
                  <div>
                    <Label className="text-base font-semibold mb-2 flex items-center gap-2">
                      <ClockIcon className="w-5 h-5" />
                      Available Times
                    </Label>
                    {getAvailableTimesForDate(selectedDate).length === 0 ? (
                      <div className="text-center py-8 bg-muted/20 rounded-xl">
                        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No available times for this date</p>
                        <p className="text-sm text-muted-foreground">Please select another date</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                        {getAvailableTimesForDate(selectedDate).map((time) => (
                          <Button
                            key={time}
                            variant={selectedTime === time ? 'default' : 'outline'}
                            onClick={() => setSelectedTime(time)}
                            className="h-auto py-3"
                          >
                            {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!selectedDate || !selectedTime}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Patient Details */}
        {step === 3 && selectedExpert && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="glass-card rounded-2xl p-8">
              <h2 className="text-2xl font-semibold mb-6">Share Your Details</h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="message">Message to Expert (Optional)</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Let the expert know why you're seeking help..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="concerns">Main Concerns (Optional)</Label>
                  <Textarea
                    id="concerns"
                    value={concerns}
                    onChange={(e) => setConcerns(e.target.value)}
                    placeholder="What would you like to work on?"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="goals">Your Goals (Optional)</Label>
                  <Textarea
                    id="goals"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    placeholder="What are you hoping to achieve?"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {/* Consent */}
                <div className="flex items-start space-x-3 p-4 bg-primary/5 rounded-xl">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1"
                  />
                  <Label htmlFor="consent" className="text-sm cursor-pointer">
                    I consent to sharing my information with the selected professional for appointment booking purposes. I understand this is a request and will be reviewed by the expert.
                  </Label>
                </div>

                {/* Summary */}
                <div className="p-4 bg-muted/20 rounded-xl space-y-2">
                  <h3 className="font-semibold mb-2">Appointment Summary</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Expert:</strong> {selectedExpert.full_name}</p>
                    <p><strong>Date:</strong> {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                    <p><strong>Time:</strong> {new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                    <p><strong>Duration:</strong> 60 minutes</p>
                    {selectedExpert.professional_profiles?.appointment_fee && (
                      <p><strong>Fee:</strong> £{selectedExpert.professional_profiles.appointment_fee}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !consent}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
