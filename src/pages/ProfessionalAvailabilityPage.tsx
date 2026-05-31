import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Sidebar from '@/components/Sidebar'
import { InfoDialogButton } from '@/components/InfoDialog'

interface AvailabilitySlot {
  id?: string
  day_of_week: string
  start_time: string
  end_time: string
  is_active: boolean
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
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

  const handleSave = async () => {
    if (!userProfile) return

    setSaving(true)
    try {
      // Delete existing availability
      await supabase
        .from('professional_availability')
        .delete()
        .eq('professional_id', userProfile.id)

      // Insert new availability
      const slotsToInsert = availability.map(slot => ({
        professional_id: userProfile.id,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_active: slot.is_active
      }))

      const { error } = await supabase
        .from('professional_availability')
        .insert(slotsToInsert)

      if (error) throw error

      toast.success('✅ Availability saved successfully!')
      fetchAvailability()
    } catch (error: any) {
      console.error('Error saving availability:', error)
      toast.error('Failed to save availability')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset? This will clear all unsaved changes.')) {
      fetchAvailability()
      toast.info('Changes reset')
    }
  }

  const getSlotsByDay = (day: string) => {
    return availability
      .map((slot, index) => ({ ...slot, originalIndex: index }))
      .filter(slot => slot.day_of_week === day)
  }

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
        <Sidebar />
        <div className="flex-1 w-full flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl px-10 py-12 text-center">
            <div className="animate-spin w-12 h-12 border border-black/20 border-t-black rounded-full mx-auto mb-6"></div>
            <p className="text-black/70 font-medium tracking-wide">Loading availability...</p>
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
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Header with Action Buttons */}
          <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-8 mb-10">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 md:opacity-60"></div>
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-4">Schedule Studio</p>
                <h1 className="text-5xl font-bold text-black mb-3">
                  Availability Settings
                </h1>
                <p className="text-xl text-gray-700 font-medium">
                  Define when you're available for appointments
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  size="lg"
                  className="font-semibold text-sm tracking-wider px-7 border border-black/15 bg-white/80 hover:bg-black hover:text-white"
                  disabled={saving}
                >
                  Reset Changes
                </Button>
                <Button
                  onClick={handleSave}
                  size="lg"
                  className="font-semibold text-sm tracking-wider px-8"
                  disabled={saving}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white/40 border-t-white rounded-full"></div>
                      Saving...
                    </span>
                  ) : (
                    'Save Availability'
                  )}
                </Button>
                <InfoDialogButton
                  title="Availability Manager"
                  description="Configure the exact times patients can book with you."
                  points={[
                    'Create multiple time windows per day to map your schedule.',
                    'Use the Add Time Slot button to extend availability for any day.',
                    'Publish changes once you are happy so patients see the latest calendar.',
                  ]}
                  triggerClassName="hidden lg:inline-flex"
                />
              </div>
            </div>
          </div>

          {/* Days Grid */}
          <div className="space-y-6">
            {DAYS_OF_WEEK.map((day, dayIndex) => {
              const daySlots = getSlotsByDay(day.value)
              
              return (
                <motion.div
                  key={day.value}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: dayIndex * 0.05 }}
                  className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/55 backdrop-blur-xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
                  <div className="relative flex flex-col md:flex-row md:items-center md:justify-between mb-6 pb-4 border-b border-black/10">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-black/40">Day</p>
                      <h3 className="text-3xl font-bold text-black">
                      {day.label}
                      </h3>
                    </div>
                    <Button
                      onClick={() => addSlotForDay(day.value)}
                      variant="outline"
                      size="sm"
                      className="font-semibold tracking-widest mt-4 md:mt-0"
                    >
                      Add Time Slot
                    </Button>
                  </div>

                  {/* Time Slots */}
                  {daySlots.length === 0 ? (
                    <div className="text-center py-8 text-black/60 font-medium">
                      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/70 text-xs tracking-[0.3em]">
                        SET
                      </div>
                      <p>
                        No time slots set for {day.label}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.originalIndex}
                          className="relative rounded-2xl border border-black/10 bg-white/70 backdrop-blur p-6"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            {/* Start Time */}
                            <div>
                              <Label className="text-sm font-bold text-gray-700 mb-2">
                                Start Time
                              </Label>
                              <Input
                                type="time"
                                value={slot.start_time}
                                onChange={(e) =>
                                  updateSlot(slot.originalIndex, 'start_time', e.target.value)
                                }
                                className="font-medium"
                              />
                            </div>

                            {/* End Time */}
                            <div>
                              <Label className="text-sm font-bold text-gray-700 mb-2">
                                End Time
                              </Label>
                              <Input
                                type="time"
                                value={slot.end_time}
                                onChange={(e) =>
                                  updateSlot(slot.originalIndex, 'end_time', e.target.value)
                                }
                                className="font-medium"
                              />
                            </div>

                            {/* Remove Button */}
                            <Button
                              onClick={() => removeSlot(slot.originalIndex)}
                              variant="ghost"
                              size="lg"
                              className="font-semibold tracking-widest"
                            >
                              Remove Slot
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Bottom Save Button (Alternative) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-14 text-center"
          >
            <p className="text-black/60 mb-4 font-medium tracking-wide">
              Remember to publish your latest schedule.
            </p>
            <Button
              onClick={handleSave}
              size="xl"
              className="px-12"
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin w-5 h-5 border-2 border-white/40 border-t-white rounded-full"></div>
                  Saving...
                </span>
              ) : (
                'Publish Availability'
              )}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
