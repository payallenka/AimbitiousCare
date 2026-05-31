import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  User,
  Briefcase,
  Award,
  Camera,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  X,
  DollarSign,
  Building,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { supabase, UserRole } from '@/lib/supabase'
import { validateEmail, validatePassword, formatPhoneNumber } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

interface FormData {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  professionalTitle: string
  yearsOfExperience: string
  areasOfExpertise: string[]
  shortBio: string
  education: string[]
  certifications: string[]
  languages: string[]
  appointmentFee: string
  sessionDuration: string
  phoneNumber: string
  countryCode: string
  practiceCompanyName: string
  website: string
  profilePicture: File | null
}

const STEPS = [
  { id: 1, title: 'Basic Information', icon: User },
  { id: 2, title: 'Professional Details', icon: Briefcase },
  { id: 3, title: 'Qualifications', icon: Award },
  { id: 4, title: 'Practice Information', icon: Building },
]

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

const ROLE_TITLES: Record<string, string> = {
  therapist: 'Therapist',
  relationship_expert: 'Relationship Expert',
  financial_expert: 'Financial Expert',
  dating_coach: 'Dating Coach',
  health_wellness_coach: 'Health & Wellness Coach',
}

const SESSION_DURATIONS = ['30', '45', '60', '90', '120']

export default function ProfessionalRegistrationPage({ isSetup = false }: { isSetup?: boolean }) {
  const navigate = useNavigate()
  const { role } = useParams<{ role: string }>()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [newEducation, setNewEducation] = useState('')
  const [newCertification, setNewCertification] = useState('')
  const [newExpertise, setNewExpertise] = useState('')

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    professionalTitle: '',
    yearsOfExperience: '',
    areasOfExpertise: [],
    shortBio: '',
    education: [],
    certifications: [],
    languages: [],
    appointmentFee: '',
    sessionDuration: '60',
    phoneNumber: '',
    countryCode: '+44',
    practiceCompanyName: '',
    website: '',
    profilePicture: null,
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [previewUrl, setPreviewUrl] = useState<string>('')

  const progress = (currentStep / STEPS.length) * 100

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleLanguageToggle = (language: string) => {
    setFormData((prev) => {
      const languages = prev.languages.includes(language)
        ? prev.languages.filter((l) => l !== language)
        : [...prev.languages, language]
      return { ...prev, languages }
    })
  }

  const handleAddEducation = () => {
    if (newEducation.trim()) {
      setFormData((prev) => ({
        ...prev,
        education: [...prev.education, newEducation.trim()],
      }))
      setNewEducation('')
      setErrors((prev) => ({ ...prev, education: '' }))
    }
  }

  const handleRemoveEducation = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }))
  }

  const handleAddCertification = () => {
    if (newCertification.trim()) {
      setFormData((prev) => ({
        ...prev,
        certifications: [...prev.certifications, newCertification.trim()],
      }))
      setNewCertification('')
      setErrors((prev) => ({ ...prev, certifications: '' }))
    }
  }

  const handleRemoveCertification = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }))
  }

  const handleAddExpertise = () => {
    if (newExpertise.trim()) {
      setFormData((prev) => ({
        ...prev,
        areasOfExpertise: [...prev.areasOfExpertise, newExpertise.trim()],
      }))
      setNewExpertise('')
      setErrors((prev) => ({ ...prev, areasOfExpertise: '' }))
    }
  }

  const handleRemoveExpertise = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      areasOfExpertise: prev.areasOfExpertise.filter((_, i) => i !== index),
    }))
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
      
      setFormData((prev) => ({ ...prev, profilePicture: file }))
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Full name is required'
      }
      
      // Only validate email/password if NOT in setup mode
      if (!isSetup) {
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required'
        } else if (!validateEmail(formData.email)) {
          newErrors.email = 'Please enter a valid email'
        }
        if (!formData.password) {
          newErrors.password = 'Password is required'
        } else {
          const passwordValidation = validatePassword(formData.password)
          if (!passwordValidation.isValid) {
            newErrors.password = passwordValidation.errors[0]
          }
        }
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Please confirm your password'
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match'
        }
      }
      
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone number is required'
      }
    }

    if (step === 2) {
      if (!formData.professionalTitle.trim()) {
        newErrors.professionalTitle = 'Professional title is required'
      }
      if (!formData.yearsOfExperience) {
        newErrors.yearsOfExperience = 'Years of experience is required'
      } else if (parseInt(formData.yearsOfExperience) < 0) {
        newErrors.yearsOfExperience = 'Please enter a valid number'
      }
      if (formData.areasOfExpertise.length === 0) {
        newErrors.areasOfExpertise = 'Please add at least one area of expertise'
      }
      if (!formData.shortBio.trim()) {
        newErrors.shortBio = 'Please tell us about yourself'
      }
    }

    if (step === 3) {
      if (formData.education.length === 0) {
        newErrors.education = 'Please add at least one education entry'
      }
      if (formData.certifications.length === 0) {
        newErrors.certifications = 'Please add at least one certification'
      }
      if (formData.languages.length === 0) {
        newErrors.languages = 'Please select at least one language'
      }
    }

    if (step === 4) {
      if (!formData.appointmentFee) {
        newErrors.appointmentFee = 'Appointment fee is required'
      } else if (parseFloat(formData.appointmentFee) < 0) {
        newErrors.appointmentFee = 'Please enter a valid amount'
      }
      if (!formData.sessionDuration) {
        newErrors.sessionDuration = 'Session duration is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return
    if (!role) return

    // For isSetup mode, user must be authenticated
    if (isSetup && !user) {
      toast.error('Authentication required', {
        description: 'Please log in first to complete your profile.',
      })
      navigate('/login')
      return
    }

    // Additional check: Verify session is valid
    if (isSetup) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Session expired', {
          description: 'Please log in again to continue.',
        })
        navigate('/login')
        return
      }
      console.log('✅ User is authenticated:', session.user.id)
    }

    setLoading(true)
    try {
      let currentUserId = user?.id

      // If not in setup mode, create auth account first
      if (!isSetup) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/setup-profile`,
          }
        })

        if (authError) {
          if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
            throw new Error('This email is already in use. Please try logging in or use a different email.')
          }
          throw new Error(authError.message || 'Failed to create account.')
        }

        if (!authData.user) {
          throw new Error('Account creation failed. Please try again.')
        }

        currentUserId = authData.user.id
        
        // For non-setup mode, just send them to verify email
        toast.success('Check your email! 📧', {
          description: 'Click the verification link to complete your profile setup.',
          duration: 8000,
        })
        
        navigate('/verify-email')
        return
      }

      // From here on, we're in setup mode (user is authenticated)

      let profilePictureUrl = ''

      // Upload profile picture if provided
      if (formData.profilePicture && currentUserId) {
        const fileExt = formData.profilePicture.name.split('.').pop()
        const fileName = `${currentUserId}/profile.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, formData.profilePicture, {
            upsert: true,
            contentType: formData.profilePicture.type,
          })

        if (uploadError) {
          console.error('Error uploading profile picture:', uploadError)
          toast.warning('Profile picture upload failed', {
            description: 'Profile will be saved without the picture. You can add it later.',
          })
        } else {
          const { data: urlData } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(fileName)
          profilePictureUrl = urlData.publicUrl
        }
      }

      // Create user profile
      const { error: userError, data: userData } = await supabase
        .from('users')
        .insert({
          auth_id: currentUserId!,
          email: user!.email!,
          full_name: formData.fullName,
          user_role: role as UserRole,
          phone_number: formatPhoneNumber(formData.phoneNumber, formData.countryCode),
          profile_picture_url: profilePictureUrl,
          short_bio: formData.shortBio,
        })
        .select()
        .single()

      if (userError) {
        console.error('User profile error:', userError)
        
        // Specific error messages
        if (userError.code === '42501') {
          throw new Error('Authentication error: Your session may have expired. Please log out and log in again.')
        }
        if (userError.message.includes('duplicate') || userError.code === '23505') {
          throw new Error('A profile already exists for this account. Please contact support.')
        }
        
        throw new Error(`Failed to create profile: ${userError.message || 'Please check your Supabase configuration.'}`)
      }

      // Create professional profile
      const { error: professionalError } = await supabase
        .from('professional_profiles')
        .insert({
          user_id: userData.id,
          professional_title: formData.professionalTitle,
          years_of_experience: parseInt(formData.yearsOfExperience),
          areas_of_expertise: formData.areasOfExpertise,
          education: formData.education,
          certifications: formData.certifications,
          languages: formData.languages,
          appointment_fee: formData.appointmentFee ? parseFloat(formData.appointmentFee) : null,
          session_duration: formData.sessionDuration ? parseInt(formData.sessionDuration) : null,
          practice_company_name: formData.practiceCompanyName || null,
          website: formData.website || null,
        })

      if (professionalError) {
        console.error('Professional profile error:', professionalError)
        throw new Error('Failed to save professional details. Please try again.')
      }

      toast.success('Profile completed!', {
        description: 'Welcome to Ambitious Care!',
        duration: 3000,
      })

      // Navigate to dashboard
      setTimeout(() => {
        navigate('/dashboard')
        window.location.reload() // Force refresh to update auth context
      }, 1000)
    } catch (error: any) {
      console.error('Registration error:', error)
      
      let errorMessage = 'Something went wrong. Please try again.'
      
      if (error.message) {
        errorMessage = error.message
      } else if (error.code === 'PGRST116') {
        errorMessage = 'Database connection issue. Please try again in a moment.'
      }
      
      toast.error('Registration failed', {
        description: errorMessage,
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  if (!role || !ROLE_TITLES[role]) {
    return (
      <div className="min-h-screen cosmic-bg flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive mb-4">Invalid registration role</p>
          <Link to="/register">
            <Button>Back to Registration</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen cosmic-bg flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl my-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/register" className="inline-block mb-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full glass-card"
            >
              <Brain className="w-8 h-8 text-primary" />
            </motion.div>
          </Link>
          <h1 className="text-4xl font-heading font-bold text-black font-bold mb-2">
            Ambitious Care
          </h1>
          <p className="text-muted-foreground mb-4">
            Mental health for construction workers
          </p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card rounded-2xl p-8 shadow-2xl"
        >
          {/* Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-heading font-semibold mb-2">
              Create your {ROLE_TITLES[role]} Account
            </h2>
            <p className="text-sm text-muted-foreground">
              Join our platform to help those in need.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium">
                Step {currentStep} of {STEPS.length}
              </span>
              <span className="text-sm text-primary font-medium">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps Indicator */}
          <div className="flex justify-between mb-8">
            {STEPS.map((step) => {
              const Icon = step.icon
              const isCompleted = step.id < currentStep
              const isCurrent = step.id === currentStep
              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : isCurrent
                        ? 'bg-primary/20 text-primary ring-2 ring-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs text-center hidden sm:block">
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Form Steps */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 mb-8 max-h-[60vh] overflow-y-auto pr-2"
            >
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="Dr. Jane Smith"
                      value={formData.fullName}
                      onChange={handleChange}
                      className={errors.fullName ? 'border-destructive' : ''}
                    />
                    {errors.fullName && (
                      <p className="text-xs text-destructive">{errors.fullName}</p>
                    )}
                  </div>

                  {!isSetup && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="jane.smith@example.com"
                          value={formData.email}
                          onChange={handleChange}
                          className={errors.email ? 'border-destructive' : ''}
                        />
                        {errors.email && (
                          <p className="text-xs text-destructive">{errors.email}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            className={
                              errors.password ? 'border-destructive pr-10' : 'pr-10'
                            }
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="text-xs text-destructive">{errors.password}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Must be at least 8 characters with uppercase, lowercase, and
                          number
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password *</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className={
                              errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'
                            }
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-xs text-destructive">
                            {errors.confirmPassword}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="countryCode"
                        name="countryCode"
                        value={formData.countryCode}
                        onChange={handleChange}
                        className="w-24"
                        placeholder="+44"
                      />
                      <Input
                        id="phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        placeholder="7700900000"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        className={
                          errors.phoneNumber ? 'border-destructive flex-1' : 'flex-1'
                        }
                      />
                    </div>
                    {errors.phoneNumber && (
                      <p className="text-xs text-destructive">{errors.phoneNumber}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profilePicture">Profile Picture (Optional)</Label>
                    <div className="flex items-center gap-4">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Profile preview"
                          className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                          <Camera className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <div className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm font-medium">
                          Choose Photo
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Professional Details */}
              {currentStep === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="professionalTitle">Professional Title *</Label>
                    <Input
                      id="professionalTitle"
                      name="professionalTitle"
                      placeholder="e.g., Licensed Clinical Psychologist"
                      value={formData.professionalTitle}
                      onChange={handleChange}
                      className={
                        errors.professionalTitle ? 'border-destructive' : ''
                      }
                    />
                    {errors.professionalTitle && (
                      <p className="text-xs text-destructive">
                        {errors.professionalTitle}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="yearsOfExperience">
                      Years of Experience *
                    </Label>
                    <Input
                      id="yearsOfExperience"
                      name="yearsOfExperience"
                      type="number"
                      min="0"
                      placeholder="5"
                      value={formData.yearsOfExperience}
                      onChange={handleChange}
                      className={
                        errors.yearsOfExperience ? 'border-destructive' : ''
                      }
                    />
                    {errors.yearsOfExperience && (
                      <p className="text-xs text-destructive">
                        {errors.yearsOfExperience}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Areas of Expertise *</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add an area of expertise"
                        value={newExpertise}
                        onChange={(e) => setNewExpertise(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddExpertise()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddExpertise}
                        disabled={!newExpertise.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {formData.areasOfExpertise.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.areasOfExpertise.map((expertise, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                          >
                            <span>{expertise}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExpertise(index)}
                              className="hover:text-destructive transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {errors.areasOfExpertise && (
                      <p className="text-xs text-destructive">
                        {errors.areasOfExpertise}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shortBio">Short Bio *</Label>
                    <Textarea
                      id="shortBio"
                      name="shortBio"
                      placeholder="Tell us about your professional background, approach, and what makes you passionate about helping others..."
                      value={formData.shortBio}
                      onChange={handleChange}
                      className={
                        errors.shortBio
                          ? 'border-destructive min-h-[120px]'
                          : 'min-h-[120px]'
                      }
                    />
                    {errors.shortBio && (
                      <p className="text-xs text-destructive">{errors.shortBio}</p>
                    )}
                  </div>
                </>
              )}

              {/* Step 3: Qualifications */}
              {currentStep === 3 && (
                <>
                  <div className="space-y-2">
                    <Label>Education *</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., PhD in Clinical Psychology, Harvard University"
                        value={newEducation}
                        onChange={(e) => setNewEducation(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddEducation()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddEducation}
                        disabled={!newEducation.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {formData.education.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {formData.education.map((edu, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 p-3 bg-muted rounded-lg"
                          >
                            <Award className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-sm flex-1">{edu}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEducation(index)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {errors.education && (
                      <p className="text-xs text-destructive">{errors.education}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Certifications *</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., Licensed Professional Counselor (LPC)"
                        value={newCertification}
                        onChange={(e) => setNewCertification(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCertification()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddCertification}
                        disabled={!newCertification.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {formData.certifications.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {formData.certifications.map((cert, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 p-3 bg-muted rounded-lg"
                          >
                            <Award className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-sm flex-1">{cert}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCertification(index)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {errors.certifications && (
                      <p className="text-xs text-destructive">
                        {errors.certifications}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Languages You Speak *</Label>
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
                    {errors.languages && (
                      <p className="text-xs text-destructive">{errors.languages}</p>
                    )}
                  </div>
                </>
              )}

              {/* Step 4: Practice Information */}
              {currentStep === 4 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="appointmentFee">Appointment Fee (£) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="appointmentFee"
                        name="appointmentFee"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="50.00"
                        value={formData.appointmentFee}
                        onChange={handleChange}
                        className={
                          errors.appointmentFee
                            ? 'border-destructive pl-10'
                            : 'pl-10'
                        }
                      />
                    </div>
                    {errors.appointmentFee && (
                      <p className="text-xs text-destructive">
                        {errors.appointmentFee}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionDuration">Session Duration (minutes) *</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {SESSION_DURATIONS.map((duration) => (
                        <button
                          key={duration}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              sessionDuration: duration,
                            }))
                          }
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            formData.sessionDuration === duration
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          }`}
                        >
                          {duration}
                        </button>
                      ))}
                    </div>
                    {errors.sessionDuration && (
                      <p className="text-xs text-destructive">
                        {errors.sessionDuration}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="practiceCompanyName">
                      Practice/Company Name (Optional)
                    </Label>
                    <Input
                      id="practiceCompanyName"
                      name="practiceCompanyName"
                      placeholder="e.g., Mindful Wellness Clinic"
                      value={formData.practiceCompanyName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      placeholder="https://www.yourwebsite.com"
                      value={formData.website}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-4">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={loading}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <Link to="/register">
                <Button type="button" variant="ghost">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
            )}

            {currentStep < STEPS.length ? (
              <Button type="button" onClick={handleNext} disabled={loading}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <Check className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary hover:text-accent transition-colors font-medium"
              >
                Log in here
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

