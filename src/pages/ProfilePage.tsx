import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Brain,
  LogOut,
  Edit,
  Save,
  X,
  Camera,
  User,
  Briefcase,
  Award,
  Heart,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase, PatientProfile, ProfessionalProfile } from '@/lib/supabase'
import { toast } from 'sonner'

const COMMON_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Polish',
  'Portuguese',
  'Italian',
  'Romanian',
  'Lithuanian',
  'Hindi',
  'Urdu',
  'Arabic',
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, userProfile, signOut, refreshProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [newProfilePicture, setNewProfilePicture] = useState<File | null>(null)

  // Patient or Professional specific data
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null)
  const [professionalProfile, setProfessionalProfile] = useState<ProfessionalProfile | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    short_bio: '',
    // Patient specific
    emergency_contact_name: '',
    emergency_contact_phone: '',
    languages: [] as string[],
    // Professional specific
    professional_title: '',
    years_of_experience: '',
    areas_of_expertise: [] as string[],
    education: [] as string[],
    certifications: [] as string[],
    appointment_fee: '',
    session_duration: '',
    practice_company_name: '',
    website: '',
  })

  useEffect(() => {
    loadProfile()
  }, [user, userProfile])

  const loadProfile = async () => {
    if (!user || !userProfile) {
      setLoadingProfile(false)
      return
    }

    try {
      // Set basic info
      setFormData((prev) => ({
        ...prev,
        full_name: userProfile.full_name || '',
        phone_number: userProfile.phone_number || '',
        short_bio: userProfile.short_bio || '',
      }))

      setPreviewUrl(userProfile.profile_picture_url || '')

      // Load role-specific data
      if (userProfile.user_role === 'patient') {
        const { data, error } = await supabase
          .from('patient_profiles')
          .select('*')
          .eq('user_id', userProfile.id)
          .single()

        if (error) throw error
        if (data) {
          setPatientProfile(data)
          setFormData((prev) => ({
            ...prev,
            emergency_contact_name: data.emergency_contact_name || '',
            emergency_contact_phone: data.emergency_contact_phone || '',
            languages: data.languages || [],
          }))
        }
      } else {
        const { data, error } = await supabase
          .from('professional_profiles')
          .select('*')
          .eq('user_id', userProfile.id)
          .single()

        if (error) throw error
        if (data) {
          setProfessionalProfile(data)
          setFormData((prev) => ({
            ...prev,
            professional_title: data.professional_title || '',
            years_of_experience: data.years_of_experience?.toString() || '',
            areas_of_expertise: data.areas_of_expertise || [],
            education: data.education || [],
            certifications: data.certifications || [],
            languages: data.languages || [],
            appointment_fee: data.appointment_fee?.toString() || '',
            session_duration: data.session_duration?.toString() || '',
            practice_company_name: data.practice_company_name || '',
            website: data.website || '',
          }))
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error)
      toast.error('Failed to load profile', {
        description: error.message || 'Please try refreshing the page.',
      })
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLanguageToggle = (language: string) => {
    setFormData((prev) => {
      const languages = prev.languages.includes(language)
        ? prev.languages.filter((l) => l !== language)
        : [...prev.languages, language]
      return { ...prev, languages }
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large', {
          description: 'Please select an image under 10MB',
        })
        return
      }

      // Check file type (only images)
      if (!file.type.startsWith('image/')) {
        toast.error('Invalid file type', {
          description: 'Please select an image file (JPG, PNG, GIF, etc.)',
        })
        return
      }

      setNewProfilePicture(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleSave = async () => {
    if (!user || !userProfile) return

    setLoading(true)
    try {
      let profilePictureUrl = userProfile.profile_picture_url

      // Upload new profile picture if provided
      if (newProfilePicture) {
        const fileExt = newProfilePicture.name.split('.').pop()
        const fileName = `${user.id}/profile.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, newProfilePicture, {
            upsert: true,
            contentType: newProfilePicture.type,
          })

        if (uploadError) {
          console.error('Error uploading profile picture:', uploadError)
          toast.error('Failed to upload profile picture', {
            description: uploadError.message,
          })
        } else {
          const { data: urlData } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(fileName)
          profilePictureUrl = urlData.publicUrl
        }
      }

      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          short_bio: formData.short_bio,
          profile_picture_url: profilePictureUrl,
        })
        .eq('id', userProfile.id)

      if (userError) throw userError

      // Update role-specific table
      if (userProfile.user_role === 'patient') {
        const { error: patientError } = await supabase
          .from('patient_profiles')
          .update({
            emergency_contact_name: formData.emergency_contact_name || null,
            emergency_contact_phone: formData.emergency_contact_phone || null,
            languages: formData.languages,
          })
          .eq('user_id', userProfile.id)

        if (patientError) throw patientError
      } else {
        const { error: professionalError } = await supabase
          .from('professional_profiles')
          .update({
            professional_title: formData.professional_title,
            years_of_experience: parseInt(formData.years_of_experience) || 0,
            areas_of_expertise: formData.areas_of_expertise,
            education: formData.education,
            certifications: formData.certifications,
            languages: formData.languages,
            appointment_fee: parseFloat(formData.appointment_fee) || 0,
            session_duration: parseInt(formData.session_duration) || 60,
            practice_company_name: formData.practice_company_name || null,
            website: formData.website || null,
          })
          .eq('user_id', userProfile.id)

        if (professionalError) throw professionalError
      }

      await refreshProfile()
      setIsEditing(false)
      setNewProfilePicture(null)
      toast.success('Profile updated successfully! 🎉')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile', {
        description: error.message || 'Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setNewProfilePicture(null)
    loadProfile()
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center cosmic-bg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen cosmic-bg">
      {/* Navigation */}
      <nav className="glass-card border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-heading font-bold gradient-text">
                Ambitious Care
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-heading font-bold mb-2">My Profile</h1>
              <p className="text-muted-foreground">
                Account type: <span className="text-primary capitalize">{userProfile?.user_role.replace('_', ' ')}</span>
              </p>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleCancel} disabled={loading}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Profile Card */}
          <div className="glass-card rounded-2xl p-8 space-y-8">
            {/* Profile Picture */}
            <div className="flex items-center gap-6">
              <div className="relative">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-border">
                    <Camera className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                {isEditing && (
                  <label className="absolute bottom-0 right-0 cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg">
                      <Camera className="w-5 h-5" />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-heading font-semibold">{userProfile?.full_name}</h2>
                <p className="text-muted-foreground">{userProfile?.email}</p>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-xl font-heading font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                    />
                  ) : (
                    <p className="text-foreground">{userProfile?.full_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <p className="text-muted-foreground text-sm">
                    {userProfile?.email} (cannot be changed)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="phone_number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                    />
                  ) : (
                    <p className="text-foreground">{userProfile?.phone_number}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="short_bio">Bio</Label>
                {isEditing ? (
                  <Textarea
                    id="short_bio"
                    name="short_bio"
                    value={formData.short_bio}
                    onChange={handleChange}
                    className="min-h-[100px]"
                  />
                ) : (
                  <p className="text-foreground">{userProfile?.short_bio || 'No bio provided'}</p>
                )}
              </div>
            </div>

            {/* Patient-specific fields */}
            {userProfile?.user_role === 'patient' && (
              <div className="space-y-4">
                <h3 className="text-xl font-heading font-semibold flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Emergency Contact
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                    {isEditing ? (
                      <Input
                        id="emergency_contact_name"
                        name="emergency_contact_name"
                        value={formData.emergency_contact_name}
                        onChange={handleChange}
                      />
                    ) : (
                      <p className="text-foreground">
                        {patientProfile?.emergency_contact_name || 'Not provided'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                    {isEditing ? (
                      <Input
                        id="emergency_contact_phone"
                        name="emergency_contact_phone"
                        value={formData.emergency_contact_phone}
                        onChange={handleChange}
                      />
                    ) : (
                      <p className="text-foreground">
                        {patientProfile?.emergency_contact_phone || 'Not provided'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Languages</Label>
                  {isEditing ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {COMMON_LANGUAGES.map((language) => (
                        <button
                          key={language}
                          type="button"
                          onClick={() => handleLanguageToggle(language)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            formData.languages.includes(language)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          }`}
                        >
                          {language}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {patientProfile?.languages?.map((lang) => (
                        <span
                          key={lang}
                          className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Professional-specific fields */}
            {userProfile?.user_role !== 'patient' && professionalProfile && (
              <>
                <div className="space-y-4">
                  <h3 className="text-xl font-heading font-semibold flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    Professional Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="professional_title">Professional Title</Label>
                      {isEditing ? (
                        <Input
                          id="professional_title"
                          name="professional_title"
                          value={formData.professional_title}
                          onChange={handleChange}
                        />
                      ) : (
                        <p className="text-foreground">{professionalProfile.professional_title}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="years_of_experience">Years of Experience</Label>
                      {isEditing ? (
                        <Input
                          id="years_of_experience"
                          name="years_of_experience"
                          type="number"
                          value={formData.years_of_experience}
                          onChange={handleChange}
                        />
                      ) : (
                        <p className="text-foreground">{professionalProfile.years_of_experience} years</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="appointment_fee">Appointment Fee (£)</Label>
                      {isEditing ? (
                        <Input
                          id="appointment_fee"
                          name="appointment_fee"
                          type="number"
                          value={formData.appointment_fee}
                          onChange={handleChange}
                        />
                      ) : (
                        <p className="text-foreground">£{professionalProfile.appointment_fee}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="session_duration">Session Duration (minutes)</Label>
                      {isEditing ? (
                        <Input
                          id="session_duration"
                          name="session_duration"
                          type="number"
                          value={formData.session_duration}
                          onChange={handleChange}
                        />
                      ) : (
                        <p className="text-foreground">{professionalProfile.session_duration} minutes</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="practice_company_name">Practice/Company</Label>
                      {isEditing ? (
                        <Input
                          id="practice_company_name"
                          name="practice_company_name"
                          value={formData.practice_company_name}
                          onChange={handleChange}
                        />
                      ) : (
                        <p className="text-foreground">
                          {professionalProfile.practice_company_name || 'Not provided'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      {isEditing ? (
                        <Input
                          id="website"
                          name="website"
                          value={formData.website}
                          onChange={handleChange}
                        />
                      ) : (
                        <p className="text-foreground">
                          {professionalProfile.website ? (
                            <a
                              href={professionalProfile.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {professionalProfile.website}
                            </a>
                          ) : (
                            'Not provided'
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Areas of Expertise</Label>
                    <div className="flex flex-wrap gap-2">
                      {professionalProfile.areas_of_expertise?.map((area, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Education</Label>
                    <div className="space-y-2">
                      {professionalProfile.education?.map((edu, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                          <Award className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{edu}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Certifications</Label>
                    <div className="space-y-2">
                      {professionalProfile.certifications?.map((cert, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                          <Award className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Languages</Label>
                    {isEditing ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {COMMON_LANGUAGES.map((language) => (
                          <button
                            key={language}
                            type="button"
                            onClick={() => handleLanguageToggle(language)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              formData.languages.includes(language)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                            }`}
                          >
                            {language}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {professionalProfile.languages?.map((lang) => (
                          <span
                            key={lang}
                            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

