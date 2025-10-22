import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, Plus, Trash2, Save, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Navbar from '@/components/Navbar'

interface AvailabilitySlot {
  id?: string
  day_of_week: string
  start_time: string
  end_time: string
  is_active: boolean
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday', emoji: '📅' },
  { value: 'tuesday', label: 'Tuesday', emoji: '📅' },
  { value: 'wednesday', label: 'Wednesday', emoji: '📅' },
  { value: 'thursday', label: 'Thursday', emoji: '📅' },
  { value: 'friday', label: 'Friday', emoji: '📅' },
  { value: 'saturday', label: 'Saturday', emoji: '📅' },
  { value: 'sunday', label: 'Sunday', emoji: '📅' },
]

export default function ProfessionalAvailabilityPage() {
  const { userProfile } = useAuth()
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (userProfile) {
      fetchAvailability()
    }
  }, [userProfile])

  const fetchAvailability = async () => {
    if (!userProfile) return

    try {
      const { data, error } = await supabase
        .from('professional_availability')
        .select('*')
        .eq('professional_id', userProfile.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error

      setAvailability(data || [])
    } catch (error: any) {
      console.error('Error fetching availability:', error)
      toast.error('Failed to load availability')
    } finally {
      setLoading(false)
    }
  }

  const addSlotForDay = (day: string) => {
    const newSlot: AvailabilitySlot = {
      day_of_week: day,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true
    }
    setAvailability([...availability, newSlot])
  }

  const updateSlot = (index: number, field: keyof AvailabilitySlot, value: any) => {
    const updated = [...availability]
    updated[index] = { ...updated[index], [field]: value }
    setAvailability(updated)
  }

  const removeSlot = (index: number) => {
    const updated = availability.filter((_, i) => i !== index)
    setAvailability(updated)
  }

  const saveAvailability = async () => {
    if (!userProfile) return

    setSaving(true)
    try {
      // Delete existing availability
      await supabase
        .from('professional_availability')
        .delete()
        .eq('professional_id', userProfile.id)

      // Insert new availability
      if (availability.length > 0) {
        const availabilityData = availability.map(slot => ({
          professional_id: userProfile.id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_active: slot.is_active
        }))

        const { error } = await supabase
          .from('professional_availability')
          .insert(availabilityData)

        if (error) throw error
      }

      toast.success('✅ Availability saved successfully!', {
        description: 'Your schedule has been updated'
      })
      fetchAvailability()
    } catch (error: any) {
      console.error('Error saving availability:', error)
      toast.error('Failed to save availability')
    } finally {
      setSaving(false)
    }
  }

  const getSlotsForDay = (day: string) => {
    return availability
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.day_of_week === day)
  }

  if (loading) {
    return (
      <div className="min-h-screen cosmic-bg flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading availability...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen cosmic-bg">
      <Navbar />
      
      <div className="max-w-6xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-heading font-bold gradient-text mb-3">
            ⏰ Your Availability Schedule
          </h1>
          <p className="text-muted-foreground text-lg">
            Set your weekly availability for patient appointments. Patients will only see and book during these times.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {DAYS_OF_WEEK.map((day, dayIndex) => {
            const daySlots = getSlotsForDay(day.value)
            
            return (
              <motion.div
                key={day.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIndex * 0.05 }}
                className="glass-card rounded-2xl p-6 hover:shadow-xl transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{day.label}</h3>
                      <p className="text-xs text-muted-foreground">
                        {daySlots.length} {daySlots.length === 1 ? 'slot' : 'slots'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addSlotForDay(day.value)}
                    className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                {daySlots.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-muted-foreground/20 rounded-xl">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm">No availability set</p>
                    <p className="text-xs text-muted-foreground">Click "Add" to create time slots</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {daySlots.map(({ slot, index }) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative group"
                      >
                        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-primary/20 hover:border-primary/40 transition-all">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs font-medium mb-1 block text-muted-foreground">
                                Start Time
                              </Label>
                              <Input
                                type="time"
                                value={slot.start_time}
                                onChange={(e) => updateSlot(index, 'start_time', e.target.value)}
                                className="bg-background/50 border-primary/20"
                              />
                            </div>

                            <div>
                              <Label className="text-xs font-medium mb-1 block text-muted-foreground">
                                End Time
                              </Label>
                              <Input
                                type="time"
                                value={slot.end_time}
                                onChange={(e) => updateSlot(index, 'end_time', e.target.value)}
                                className="bg-background/50 border-primary/20"
                              />
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSlot(index)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 flex justify-end gap-4"
        >
          <Button
            variant="outline"
            onClick={fetchAvailability}
            disabled={saving}
            className="px-6"
          >
            Reset Changes
          </Button>
          <Button
            onClick={saveAvailability}
            disabled={saving || availability.length === 0}
            className="px-8 py-6 text-lg bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Availability
              </>
            )}
          </Button>
        </motion.div>

        {availability.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 glass-card rounded-2xl p-6 bg-primary/5 border border-primary/20"
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-primary mb-1">Ready to Accept Appointments</h3>
                <p className="text-sm text-muted-foreground">
                  You have {availability.length} time {availability.length === 1 ? 'slot' : 'slots'} configured. 
                  Patients can now book appointments during your available times.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
