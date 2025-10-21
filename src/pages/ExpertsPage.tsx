import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  MessageCircle,
  Briefcase,
  GraduationCap,
  Globe,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import Navbar from '@/components/Navbar'

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
  therapist: 'Therapist',
  relationship_expert: 'Relationship Expert',
  financial_expert: 'Financial Expert',
  dating_coach: 'Dating Coach',
  health_wellness_coach: 'Health & Wellness Coach',
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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading experts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen cosmic-bg">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold gradient-text mb-2">
            Find an Expert
          </h1>
          <p className="text-muted-foreground">
            Connect with mental health professionals who can help you
          </p>
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
                className="glass-card rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                {/* Expert Header */}
                <div
                  className="flex items-start gap-4 cursor-pointer"
                  onClick={() =>
                    setExpandedExpert(
                      expandedExpert === expert.id ? null : expert.id
                    )
                  }
                >
                  <img
                    src={
                      expert.profile_picture_url ||
                      'https://via.placeholder.com/100'
                    }
                    alt={expert.full_name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-heading font-semibold truncate">
                      {expert.full_name}
                    </h3>
                    <p className="text-primary text-sm">
                      {expert.professional_title}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {ROLE_LABELS[expert.user_role]}
                    </p>
                  </div>
                  {expandedExpert === expert.id ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                {/* Quick Info */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {expert.years_of_experience} years
                  </span>
                  {expert.appointment_fee && (
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      £{expert.appointment_fee}
                    </span>
                  )}
                  {expert.session_duration && (
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {expert.session_duration} min
                    </span>
                  )}
                </div>

                {/* Bio */}
                {expert.short_bio && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
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
                      className="overflow-hidden mt-4 space-y-4 border-t border-border pt-4"
                    >
                      {/* Areas of Expertise */}
                      {expert.areas_of_expertise &&
                        expert.areas_of_expertise.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Briefcase className="w-4 h-4" />
                              Specializations
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {expert.areas_of_expertise.map((area, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-muted text-xs rounded"
                                >
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Education */}
                      {expert.education && expert.education.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4" />
                            Education
                          </h4>
                          <ul className="space-y-1">
                            {expert.education.map((edu, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground">
                                • {edu}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Languages */}
                      {expert.languages && expert.languages.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Languages
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {expert.languages.join(', ')}
                          </p>
                        </div>
                      )}

                      {/* Practice Info */}
                      {expert.practice_company_name && (
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Practice</h4>
                          <p className="text-sm text-muted-foreground">
                            {expert.practice_company_name}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chat Button */}
                <div className="mt-4">
                  <Button
                    className="w-full"
                    onClick={() => handleStartChat(expert.user_id)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Start Chat
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

