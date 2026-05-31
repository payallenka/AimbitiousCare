import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Mail,
  Phone,
  Calendar,
  MapPin,
  X,
  CheckCircle,
  Clock,
  User,
  Heart,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import Sidebar from '@/components/Sidebar'
import { InfoDialogButton } from '@/components/InfoDialog'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface InvitedUser {
  id: string
  email: string
  status: string
  created_at: string
  accepted_at: string | null
  invited_user_id: string | null
  user_details: {
    id: string
    full_name: string
    email: string
    phone_number: string
    user_role: string
    profile_picture_url: string | null
    short_bio: string | null
    created_at: string
  } | null
  patient_profile: {
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    languages: string[]
  } | null
}

export default function CompanyEmployeesPage() {
  const { userProfile } = useAuth()
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([])
  const [selectedUser, setSelectedUser] = useState<InvitedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'accepted' | 'pending'>('all')

  useEffect(() => {
    if (userProfile) {
      fetchInvitedUsers()
    }
  }, [userProfile])

  const fetchInvitedUsers = async () => {
    try {
      setLoading(true)
      
      // Fetch all invitations
      const { data: invitations, error: invError } = await supabase
        .from('company_invitations')
        .select('*')
        .eq('company_id', userProfile?.id)
        .order('created_at', { ascending: false })

      if (invError) throw invError

      // For each invitation that has an invited_user_id, fetch their details
      const usersWithDetails = await Promise.all(
        (invitations || []).map(async (invitation) => {
          if (invitation.invited_user_id) {
            // Fetch user details
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', invitation.invited_user_id)
              .single()

            // Fetch patient profile if user is a patient
            let patientProfile = null
            if (userData?.user_role === 'patient') {
              const { data: profileData } = await supabase
                .from('patient_profiles')
                .select('*')
                .eq('user_id', invitation.invited_user_id)
                .single()
              
              patientProfile = profileData
            }

            return {
              ...invitation,
              user_details: userData,
              patient_profile: patientProfile,
            }
          }
          return {
            ...invitation,
            user_details: null,
            patient_profile: null,
          }
        })
      )

      setInvitedUsers(usersWithDetails)
    } catch (error: any) {
      console.error('Error fetching invited users:', error)
      toast.error('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = invitedUsers.filter(user => {
    if (filter === 'accepted') return user.status === 'accepted' && user.user_details
    if (filter === 'pending') return user.status === 'pending'
    return true
  })

  const getStatusBadge = (status: string, hasUser: boolean) => {
    if (!hasUser) {
      return 'bg-white/70 text-black/70 border border-black/15'
    }
    if (status === 'accepted') {
      return 'bg-black text-white border border-black'
    }
    return 'bg-white/60 text-black/60 border border-black/15'
  }

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
        <Sidebar />
        <div className="flex-1 w-full flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl px-10 py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border border-black/20 border-t-black mx-auto mb-6" />
            <p className="text-black/70 font-medium tracking-wide">Loading employees...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <Sidebar />

      <div className="flex-1 w-full px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
        <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-3">Company</p>
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-10 h-10 text-black" />
              <h1 className="text-4xl font-heading font-bold text-black">
                Employee Directory
              </h1>
            </div>
            <p className="text-black/60 text-lg">
              View and manage all invited employees and their profiles.
            </p>
          </div>
          <InfoDialogButton
            title="Managing employees"
            description="Track invitations and see who from your company is active."
            points={[
              'Use the tabs to filter by active employees or pending invitations.',
              'Select a card to review contact details and profile information.',
              'Invitees appear automatically once they accept and complete setup.',
            ]}
          />
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex gap-2"
        >
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
          >
            All ({invitedUsers.length})
          </Button>
          <Button
            onClick={() => setFilter('accepted')}
            variant={filter === 'accepted' ? 'default' : 'outline'}
          >
            Active ({invitedUsers.filter(u => u.status === 'accepted' && u.user_details).length})
          </Button>
          <Button
            onClick={() => setFilter('pending')}
            variant={filter === 'pending' ? 'default' : 'outline'}
          >
            Pending ({invitedUsers.filter(u => u.status === 'pending').length})
          </Button>
        </motion.div>

        {/* Employee Tiles Grid */}
        {filteredUsers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-16 text-center"
          >
            <Users className="w-20 h-20 text-muted-foreground mx-auto mb-6 opacity-50" />
            <h3 className="text-2xl font-heading font-semibold mb-2">No employees found</h3>
            <p className="text-muted-foreground">
              {filter === 'pending' 
                ? 'No pending invitations' 
                : filter === 'accepted'
                ? 'No active employees yet'
                : 'Start inviting employees to see them here'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => user.user_details && setSelectedUser(user)}
                className={`glass-card rounded-2xl p-6 transition-all ${
                  user.user_details ? 'cursor-pointer hover:scale-105 hover:shadow-2xl' : ''
                }`}
              >
                {/* Avatar */}
                <div className="flex flex-col items-center mb-4">
                  <div className="relative mb-3">
                    {user.user_details?.profile_picture_url ? (
                      <img
                        src={user.user_details.profile_picture_url}
                        alt={user.user_details.full_name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center border-4 border-black/20">
                        <User className="w-12 h-12 text-white" />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase border ${getStatusBadge(user.status, !!user.user_details)}`}>
                        {user.user_details ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Name */}
                  <h3 className="text-xl font-heading font-bold text-center mb-1">
                    {user.user_details?.full_name || user.email}
                  </h3>

                  {/* Role */}
                  {user.user_details && (
                    <p className="text-sm text-muted-foreground capitalize">
                      {user.user_details.user_role.replace('_', ' ')}
                    </p>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground truncate">{user.email}</span>
                  </div>

                  {user.user_details && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{user.user_details.phone_number}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground text-xs">
                      Invited {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {user.accepted_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-muted-foreground text-xs">
                        Joined {format(new Date(user.accepted_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>

                {/* View Details Button */}
                {user.user_details && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button
                      size="sm"
                      className="w-full"
                      variant="outline"
                    >
                      View Full Profile
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Employee Detail Modal */}
        <AnimatePresence>
          {selectedUser && selectedUser.user_details && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedUser(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="flex flex-col items-center mb-8">
                  {selectedUser.user_details.profile_picture_url ? (
                    <img
                      src={selectedUser.user_details.profile_picture_url}
                      alt={selectedUser.user_details.full_name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-primary/20 mb-4"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-black flex items-center justify-center border-4 border-black/20 mb-4">
                      <User className="w-16 h-16 text-white" />
                    </div>
                  )}
                  <h2 className="text-3xl font-heading font-bold mb-2">
                    {selectedUser.user_details.full_name}
                  </h2>
                  <p className="text-muted-foreground capitalize">
                    {selectedUser.user_details.user_role.replace('_', ' ')}
                  </p>
                </div>

                {/* Bio */}
                {selectedUser.user_details.short_bio && (
                  <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <p className="text-sm leading-relaxed">{selectedUser.user_details.short_bio}</p>
                  </div>
                )}

                {/* Contact Information */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-xl font-heading font-semibold">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      <Mail className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">Email</div>
                        <div className="text-sm font-medium">{selectedUser.user_details.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      <Phone className="w-5 h-5 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">Phone</div>
                        <div className="text-sm font-medium">{selectedUser.user_details.phone_number}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient-Specific Information */}
                {selectedUser.patient_profile && (
                  <div className="space-y-4 mb-6">
                    <h3 className="text-xl font-heading font-semibold">Additional Information</h3>
                    
                    {selectedUser.patient_profile.emergency_contact_name && (
                      <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20">
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <Heart className="w-4 h-4 text-red-500" />
                          Emergency Contact
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Name</div>
                            <div className="text-sm font-medium">{selectedUser.patient_profile.emergency_contact_name}</div>
                          </div>
                          {selectedUser.patient_profile.emergency_contact_phone && (
                            <div>
                              <div className="text-xs text-muted-foreground">Phone</div>
                              <div className="text-sm font-medium">{selectedUser.patient_profile.emergency_contact_phone}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedUser.patient_profile.languages && selectedUser.patient_profile.languages.length > 0 && (
                      <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                        <MapPin className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Languages</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedUser.patient_profile.languages.map((lang, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-primary/10 rounded-full">
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Account Details */}
                <div className="space-y-3 pt-6 border-t border-border">
                  <h3 className="text-lg font-heading font-semibold">Account Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Member Since:</span>
                      <div className="font-medium">{format(new Date(selectedUser.user_details.created_at), 'MMM d, yyyy')}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Joined Company:</span>
                      <div className="font-medium">{selectedUser.accepted_at ? format(new Date(selectedUser.accepted_at), 'MMM d, yyyy') : 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>
  )
}

