import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import Sidebar from '@/components/Sidebar'
import { InfoDialogButton } from '@/components/InfoDialog'

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" fill="%23f5f5dc"/%3E%3Ccircle cx="32" cy="24" r="12" fill="%23000"/%3E%3Cpath fill="%23000" d="M16 54c0-8.8 7.2-16 16-16s16 7.2 16 16z"/%3E%3C/svg%3E'

interface Expert {
  user_id: string // The actual user.id from users table
  id: string
  full_name: string
  email: string
  user_role: string
  phone_number: string
  profile_picture_url: string | null
  short_bio: string | null
  professional_title: string
  years_of_experience: number
  areas_of_expertise: string[]
  education: string[]
  certifications: string[]
  languages: string[]
  appointment_fee: number | null
  session_duration: number | null
  practice_company_name: string | null
  website: string | null
}

const ROLE_LABELS: Record<string, string> = {
  therapist: 'Expert',
  relationship_expert: 'Relationship Expert',
  financial_expert: 'Financial Expert',
  dating_coach: 'Dating Coach',
  health_wellness_coach: 'Health & Wellness Coach',
  executive_coach: 'Executive Coach',
  executive_mentor: 'Executive Mentor',
}

export default function ExpertsPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [experts, setExperts] = useState<Expert[]>([])
  const [filteredExperts, setFilteredExperts] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedExpert, setExpandedExpert] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filter states
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [minExperience, setMinExperience] = useState<number>(0)
  const [maxFee, setMaxFee] = useState<number>(1000)

  useEffect(() => {
    fetchExperts()
  }, [])

  useEffect(() => {
    filterExperts()
  }, [searchTerm, selectedRole, selectedLanguage, minExperience, maxFee, experts])

  const fetchExperts = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .neq('user_role', 'patient')

      if (usersError) throw usersError

      if (!usersData || usersData.length === 0) {
        setExperts([])
        setFilteredExperts([])
        setLoading(false)
        return
      }

      const userIds = usersData.map((u) => u.id)

      const { data: profsData, error: profsError } = await supabase
        .from('professional_profiles')
        .select('*')
        .in('user_id', userIds)

      if (profsError) throw profsError

      const combined = usersData.map((user) => {
        const prof = profsData?.find((p) => p.user_id === user.id)
        return {
          user_id: user.id, // Preserve the actual user.id
          ...user,
          ...prof,
        } as Expert
      })

      setExperts(combined)
      setFilteredExperts(combined)
    } catch (error: any) {
      console.error('Error fetching experts:', error)
      toast.error('Failed to load experts')
    } finally {
      setLoading(false)
    }
  }

  const filterExperts = () => {
    let filtered = [...experts]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (expert) =>
          expert.full_name.toLowerCase().includes(term) ||
          expert.professional_title?.toLowerCase().includes(term) ||
          expert.short_bio?.toLowerCase().includes(term) ||
          expert.areas_of_expertise?.some((area) =>
            area.toLowerCase().includes(term)
          ) ||
          expert.education?.some((edu) => edu.toLowerCase().includes(term)) ||
          expert.languages?.some((lang) => lang.toLowerCase().includes(term))
      )
    }

    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter((expert) => expert.user_role === selectedRole)
    }

    // Language filter
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter((expert) =>
        expert.languages?.includes(selectedLanguage)
      )
    }

    // Experience filter
    if (minExperience > 0) {
      filtered = filtered.filter(
        (expert) => expert.years_of_experience >= minExperience
      )
    }

    // Fee filter
    if (maxFee < 1000) {
      filtered = filtered.filter(
        (expert) =>
          !expert.appointment_fee || expert.appointment_fee <= maxFee
      )
    }

    setFilteredExperts(filtered)
  }

  const handleStartChat = async (expertUserId: string) => {
    if (!userProfile) {
      toast.error('Please complete your profile first')
      return
    }

    try {
      // Check if conversation already exists
      const { data: existingConv, error: checkError } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant1_id.eq.${userProfile.id},participant2_id.eq.${expertUserId}),and(participant1_id.eq.${expertUserId},participant2_id.eq.${userProfile.id})`
        )
        .maybeSingle()

      if (checkError) {
        throw checkError
      }

      if (existingConv) {
        navigate(`/chat/${existingConv.id}`)
        return
      }

      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          participant1_id: userProfile.id,
          participant2_id: expertUserId,
        })
        .select()
        .single()

      if (createError) throw createError

      navigate(`/chat/${newConv.id}`)
      toast.success('Chat started!')
    } catch (error: any) {
      console.error('Error starting chat:', error)
      toast.error('Failed to start chat')
    }
  }

  const getUniqueLanguages = () => {
    const langs = new Set<string>()
    experts.forEach((expert) => {
      expert.languages?.forEach((lang) => langs.add(lang))
    })
    return Array.from(langs).sort()
  }

  if (loading) {
    return (
      <div className="min-h-screen cosmic-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border border-black/20 border-t-black mb-4"></div>
          <p className="text-muted-foreground">Loading experts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 w-full px-4 py-10 sm:px-6 lg:px-12 lg:ml-64">
        {/* Header */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold text-black font-bold mb-2">
              Find an Expert
            </h1>
            <p className="text-muted-foreground">
              Connect with mental health professionals who can help you
            </p>
          </div>
          <InfoDialogButton
            title="Finding the right expert"
            description="Filter by specialization, experience, and language to discover the best match."
            points={[
              'Search across names, specializations, education, and languages.',
              'Use the filter panel to narrow results by role, experience, or availability.',
              'Start a secure conversation with “Start Conversation” once you find a fit.',
            ]}
          />
        </div>

        {/* Search and Filters */}
        <div className="glass-card rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, specialization, education, language..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="md:w-auto"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {showFilters ? (
                <ChevronUp className="w-4 h-4 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" />
              )}
            </Button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Expert Type
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border"
                    >
                      <option value="all">All Types</option>
                      {Object.entries(ROLE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Language
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border"
                    >
                      <option value="all">All Languages</option>
                      {getUniqueLanguages().map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Min Experience (years)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={minExperience}
                      onChange={(e) =>
                        setMinExperience(Number(e.target.value))
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Max Fee (£{maxFee})
                    </label>
                    <Input
                      type="range"
                      min="0"
                      max="1000"
                      step="10"
                      value={maxFee}
                      onChange={(e) => setMaxFee(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRole('all')
                      setSelectedLanguage('all')
                      setMinExperience(0)
                      setMaxFee(1000)
                      setSearchTerm('')
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredExperts.length} expert{filteredExperts.length !== 1 ? 's' : ''}
        </p>

        {/* Experts Grid */}
        {filteredExperts.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <p className="text-muted-foreground">
              No experts found matching your criteria
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredExperts.map((expert) => (
              <motion.div
                key={expert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/50 backdrop-blur-xl p-6 transition-all hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition pointer-events-none" />

                {/* Expert Header */}
                <div
                  className="relative z-10 flex items-start gap-5 cursor-pointer"
                  onClick={() =>
                    setExpandedExpert(
                      expandedExpert === expert.id ? null : expert.id
                    )
                  }
                >
                    <div className="relative h-20 w-20 rounded-2xl overflow-hidden border border-black/10 bg-white/80 backdrop-blur">
                      <img
                        src={expert.profile_picture_url || DEFAULT_AVATAR}
                        alt={expert.full_name}
                        className="h-full w-full object-cover"
                      />
                    <div className="absolute inset-0 rounded-2xl border border-white/30"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-[0.3em] text-black/50">
                      {ROLE_LABELS[expert.user_role]}
                    </p>
                    <h3 className="text-xl font-heading font-semibold text-black truncate">
                      {expert.full_name}
                    </h3>
                    <p className="text-sm text-black/60">
                      {expert.professional_title}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-black/60">
                      <span className="rounded-full bg-white/60 px-3 py-1 border border-black/10">
                        {expert.years_of_experience} years experience
                      </span>
                      {expert.appointment_fee && (
                        <span className="rounded-full bg-white/60 px-3 py-1 border border-black/10">
                          £{expert.appointment_fee} per session
                        </span>
                      )}
                      {expert.session_duration && (
                        <span className="rounded-full bg-white/60 px-3 py-1 border border-black/10">
                          {expert.session_duration} min session
                        </span>
                      )}
                    </div>
                  </div>
                  {expandedExpert === expert.id ? (
                    <ChevronUp className="w-5 h-5 text-black/50" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-black/50" />
                  )}
                </div>

                {/* Bio */}
                {expert.short_bio && (
                  <p className="relative z-10 mt-4 text-sm text-black/70 leading-relaxed line-clamp-3">
                    {expert.short_bio}
                  </p>
                )}

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedExpert === expert.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="relative z-10 overflow-hidden mt-5 space-y-4 border-t border-black/10 pt-4"
                    >
                      {expert.areas_of_expertise && expert.areas_of_expertise.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-black">Specialisations</h4>
                            <span className="text-xs uppercase tracking-[0.3em] text-black/40">Focus</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {expert.areas_of_expertise.map((area, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 text-xs font-medium rounded-full border border-black/10 bg-white/70"
                              >
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {expert.education && expert.education.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-black mb-2">Education</h4>
                          <ul className="space-y-1 text-sm text-black/70">
                            {expert.education.map((edu, idx) => (
                              <li key={idx}>{edu}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {expert.languages && expert.languages.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <h4 className="text-sm font-semibold text-black">Languages</h4>
                          <p className="text-sm text-black/70">
                            {expert.languages.join(', ')}
                          </p>
                        </div>
                      )}

                      {expert.practice_company_name && (
                        <div>
                          <h4 className="text-sm font-semibold text-black">Practice</h4>
                          <p className="text-sm text-black/70">
                            {expert.practice_company_name}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chat Button */}
                <div className="relative z-10 mt-6 flex items-center justify-between gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => handleStartChat(expert.user_id)}
                  >
                    Start Conversation
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

