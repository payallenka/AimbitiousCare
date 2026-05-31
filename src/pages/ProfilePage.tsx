import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Camera,
  User,
  Briefcase,
  Award,
  Heart,
  Phone,
  Mail,
  Globe,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase, PatientProfile, ProfessionalProfile } from '@/lib/supabase'
import { toast } from 'sonner'
import Sidebar from '@/components/Sidebar'

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
  const { user, userProfile, refreshProfile } = useAuth()
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
      toast.error('Failed to load profile')
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
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large (max 10MB)')
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
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
          toast.error('Failed to upload profile picture')
        } else {
          const { data: urlData } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(fileName)
          profilePictureUrl = urlData.publicUrl
        }
      }

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
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setNewProfilePicture(null)
    loadProfile()
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
        <Sidebar />
        <div className="flex-1 w-full flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent"></div>
            <p className="mt-4 text-foreground font-semibold">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <Sidebar />

      <div className="flex-1 w-full px-4 py-10 sm:px-6 lg:px-12 lg:ml-64">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">My Profile</h1>
                <p className="text-muted-foreground font-medium">
                  Manage your personal information and settings
                </p>
              </div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary-foreground hover:text-primary border-2 border-primary transition-colors"
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="px-6 py-3 bg-white text-foreground rounded-lg font-semibold border-2 border-border hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary-foreground hover:text-primary border-2 border-primary transition-colors"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {/* Role Badge */}
            <div className="mt-4 inline-block">
              <span className="px-4 py-2 bg-black text-white rounded-full text-sm font-bold uppercase tracking-wide">
                {userProfile?.user_role.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Profile Header Card */}
          <div className="elevated-card p-8 mb-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Profile Picture */}
              <div className="relative">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-black"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-black">
                    <User className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                {isEditing && (
                  <label className="absolute bottom-0 right-0 cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center hover:bg-white hover:text-black border-2 border-black transition-colors">
                      <Camera className="w-6 h-6" />
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

              {/* Basic Info Display */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold text-foreground mb-2">{userProfile?.full_name}</h2>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground justify-center md:justify-start">
                    <Mail className="w-4 h-4" />
                    <span className="font-medium">{userProfile?.email}</span>
                  </div>
                  {userProfile?.phone_number && (
                    <div className="flex items-center gap-2 text-muted-foreground justify-center md:justify-start">
                      <Phone className="w-4 h-4" />
                      <span className="font-medium">{userProfile.phone_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Quick Stats */}
              {professionalProfile && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="stat-card text-center">
                    <div className="text-2xl font-bold text-foreground">{professionalProfile.years_of_experience}</div>
                    <div className="text-xs text-muted-foreground font-bold uppercase">Years Exp.</div>
                  </div>
                  <div className="stat-card text-center">
                    <div className="text-2xl font-bold text-foreground">£{professionalProfile.appointment_fee}</div>
                    <div className="text-xs text-muted-foreground font-bold uppercase">Fee</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Basic Information Card */}
          <div className="modern-card p-8 mb-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-border">
              <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Basic Information</h3>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">Full Name</Label>
                  {isEditing ? (
                    <Input
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="border-2 border-border focus:border-black"
                    />
                  ) : (
                    <p className="text-foreground font-medium p-3 bg-muted rounded-lg">{userProfile?.full_name}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                      className="border-2 border-border focus:border-black"
                    />
                  ) : (
                    <p className="text-foreground font-medium p-3 bg-muted rounded-lg">{userProfile?.phone_number || 'Not provided'}</p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-bold text-foreground mb-2 block">Bio</Label>
                {isEditing ? (
                  <Textarea
                    name="short_bio"
                    value={formData.short_bio}
                    onChange={handleChange}
                    className="min-h-[120px] border-2 border-border focus:border-black"
                  />
                ) : (
                  <p className="text-foreground font-medium p-4 bg-muted rounded-lg whitespace-pre-wrap">
                    {userProfile?.short_bio || 'No bio provided'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Patient-specific Card */}
          {userProfile?.user_role === 'patient' && (
            <div className="modern-card p-8 mb-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-border">
                <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Emergency Contact</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">Emergency Contact Name</Label>
                  {isEditing ? (
                    <Input
                      name="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={handleChange}
                      className="border-2 border-border focus:border-black"
                    />
                  ) : (
                    <p className="text-foreground font-medium p-3 bg-muted rounded-lg">
                      {patientProfile?.emergency_contact_name || 'Not provided'}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-bold text-foreground mb-2 block">Emergency Contact Phone</Label>
                  {isEditing ? (
                    <Input
                      name="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={handleChange}
                      className="border-2 border-border focus:border-black"
                    />
                  ) : (
                    <p className="text-foreground font-medium p-3 bg-muted rounded-lg">
                      {patientProfile?.emergency_contact_phone || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-bold text-foreground mb-3 block">Languages</Label>
                {isEditing ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {COMMON_LANGUAGES.map((language) => (
                      <button
                        key={language}
                        type="button"
                        onClick={() => handleLanguageToggle(language)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border-2 ${
                          formData.languages.includes(language)
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-foreground border-border hover:border-black'
                        }`}
                      >
                        {language}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {patientProfile?.languages && patientProfile.languages.length > 0 ? (
                      patientProfile.languages.map((lang) => (
                        <span
                          key={lang}
                          className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold"
                        >
                          {lang}
                        </span>
                      ))
                    ) : (
                      <p className="text-muted-foreground font-medium">No languages specified</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Professional-specific Cards */}
          {userProfile?.user_role !== 'patient' && professionalProfile && (
            <>
              {/* Professional Details Card */}
              <div className="modern-card p-8 mb-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-border">
                  <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Professional Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-bold text-foreground mb-2 block">Professional Title</Label>
                    {isEditing ? (
                      <Input
                        name="professional_title"
                        value={formData.professional_title}
                        onChange={handleChange}
                        className="border-2 border-border focus:border-black"
                      />
                    ) : (
                      <p className="text-foreground font-medium p-3 bg-muted rounded-lg">{professionalProfile.professional_title}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-foreground mb-2 block">Years of Experience</Label>
                    {isEditing ? (
                      <Input
                        name="years_of_experience"
                        type="number"
                        value={formData.years_of_experience}
                        onChange={handleChange}
                        className="border-2 border-border focus:border-black"
                      />
                    ) : (
                      <p className="text-foreground font-medium p-3 bg-muted rounded-lg">{professionalProfile.years_of_experience} years</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-foreground mb-2 block">Appointment Fee (£)</Label>
                    {isEditing ? (
                      <Input
                        name="appointment_fee"
                        type="number"
                        value={formData.appointment_fee}
                        onChange={handleChange}
                        className="border-2 border-border focus:border-black"
                      />
                    ) : (
                      <p className="text-foreground font-medium p-3 bg-muted rounded-lg">£{professionalProfile.appointment_fee}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-foreground mb-2 block">Session Duration (minutes)</Label>
                    {isEditing ? (
                      <Input
                        name="session_duration"
                        type="number"
                        value={formData.session_duration}
                        onChange={handleChange}
                        className="border-2 border-border focus:border-black"
                      />
                    ) : (
                      <p className="text-foreground font-medium p-3 bg-muted rounded-lg">{professionalProfile.session_duration} minutes</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-foreground mb-2 block">Practice/Company</Label>
                    {isEditing ? (
                      <Input
                        name="practice_company_name"
                        value={formData.practice_company_name}
                        onChange={handleChange}
                        className="border-2 border-border focus:border-black"
                      />
                    ) : (
                      <p className="text-foreground font-medium p-3 bg-muted rounded-lg">
                        {professionalProfile.practice_company_name || 'Not provided'}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-foreground mb-2 block">Website</Label>
                    {isEditing ? (
                      <Input
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        className="border-2 border-border focus:border-black"
                      />
                    ) : (
                      <div className="p-3 bg-muted rounded-lg">
                        {professionalProfile.website ? (
                          <a
                            href={professionalProfile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground font-medium hover:underline flex items-center gap-2"
                          >
                            <Globe className="w-4 h-4" />
                            {professionalProfile.website}
                          </a>
                        ) : (
                          <p className="text-foreground font-medium">Not provided</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expertise & Qualifications Card */}
              <div className="modern-card p-8 mb-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-border">
                  <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Expertise & Qualifications</h3>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-bold text-foreground mb-3 block">Areas of Expertise</Label>
                    <div className="flex flex-wrap gap-2">
                      {professionalProfile.areas_of_expertise && professionalProfile.areas_of_expertise.length > 0 ? (
                        professionalProfile.areas_of_expertise.map((area, idx) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold"
                          >
                            {area}
                          </span>
                        ))
                      ) : (
                        <p className="text-muted-foreground font-medium">No expertise areas specified</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-foreground mb-3 block">Education</Label>
                    <div className="space-y-2">
                      {professionalProfile.education && professionalProfile.education.length > 0 ? (
                        professionalProfile.education.map((edu, idx) => (
                          <div key={idx} className="p-4 bg-muted rounded-lg border-l-4 border-black">
                            <p className="text-foreground font-medium">{edu}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground font-medium">No education information provided</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-foreground mb-3 block">Certifications</Label>
                    <div className="space-y-2">
                      {professionalProfile.certifications && professionalProfile.certifications.length > 0 ? (
                        professionalProfile.certifications.map((cert, idx) => (
                          <div key={idx} className="p-4 bg-muted rounded-lg border-l-4 border-black">
                            <p className="text-foreground font-medium">{cert}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground font-medium">No certifications provided</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-foreground mb-3 block">Languages</Label>
                    {isEditing ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {COMMON_LANGUAGES.map((language) => (
                          <button
                            key={language}
                            type="button"
                            onClick={() => handleLanguageToggle(language)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border-2 ${
                              formData.languages.includes(language)
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-foreground border-border hover:border-black'
                            }`}
                          >
                            {language}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {professionalProfile.languages && professionalProfile.languages.length > 0 ? (
                          professionalProfile.languages.map((lang) => (
                            <span
                              key={lang}
                              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold"
                            >
                              {lang}
                            </span>
                          ))
                        ) : (
                          <p className="text-muted-foreground font-medium">No languages specified</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
