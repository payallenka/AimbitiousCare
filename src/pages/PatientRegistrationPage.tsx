import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  User,
  Phone,
  Heart,
  Languages,
  Camera,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import { validateEmail, validatePassword, formatPhoneNumber } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

interface FormData {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  phoneNumber: string
  countryCode: string
  emergencyContactName: string
  emergencyContactPhone: string
  shortBio: string
  languages: string[]
  profilePicture: File | null
}

const STEPS = [
  { id: 1, title: 'Basic Information', icon: User },
  { id: 2, title: 'Contact Details', icon: Phone },
  { id: 3, title: 'Emergency Contact', icon: Heart },
  { id: 4, title: 'About You', icon: Languages },
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

export default function PatientRegistrationPage({ isSetup = false }: { isSetup?: boolean }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    countryCode: '+44',
    emergencyContactName: '',
    emergencyContactPhone: '',
    shortBio: '',
    languages: [],
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
    }

    if (step === 2) {
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone number is required'
      }
    }

    if (step === 3) {
      // Emergency contact is optional
    }

    if (step === 4) {
      if (!formData.shortBio.trim()) {
        newErrors.shortBio = 'Please tell us a bit about yourself'
      }
      if (formData.languages.length === 0) {
        newErrors.languages = 'Please select at least one language'
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
          user_role: 'patient',
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

      // Create patient profile
      const { error: patientError } = await supabase
        .from('patient_profiles')
        .insert({
          user_id: userData.id,
          emergency_contact_name: formData.emergencyContactName || null,
          emergency_contact_phone: formData.emergencyContactPhone
            ? formatPhoneNumber(formData.emergencyContactPhone, formData.countryCode)
            : null,
          languages: formData.languages,
        })

      if (patientError) {
        console.error('Patient profile error:', patientError)
        throw new Error('Failed to save patient details. Please try again.')
      }

      toast.success('Profile completed! 🎉', {
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

      toast.error('Registration failed', {
        description: error.message || 'Something went wrong. Please try again.',
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen cosmic-bg flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl my-8"
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
          <h1 className="text-4xl font-heading font-bold gradient-text mb-2">
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
              Create your Patient Account
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign up to connect with therapists and resources.
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
                <div
                  key={step.id}
                  className="flex flex-col items-center flex-1"
                >
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
              className="space-y-4 mb-8"
            >
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="John Doe"
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
                          placeholder="john.doe@example.com"
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
                        className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
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
                      Must be at least 8 characters with uppercase, lowercase, and number
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
                </>
              )}

              {/* Step 2: Contact Details */}
              {currentStep === 2 && (
                <>
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
                    <p className="text-xs text-muted-foreground">
                      We'll use this to contact you about appointments
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      Max file size: 5MB. Accepted: JPG, PNG, GIF
                    </p>
                  </div>
                </>
              )}

              {/* Step 3: Emergency Contact */}
              {currentStep === 3 && (
                <>
                  <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Optional:</strong> Provide
                      emergency contact information for safety purposes.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                    <Input
                      id="emergencyContactName"
                      name="emergencyContactName"
                      placeholder="Jane Doe"
                      value={formData.emergencyContactName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactPhone">
                      Emergency Contact Phone
                    </Label>
                    <Input
                      id="emergencyContactPhone"
                      name="emergencyContactPhone"
                      type="tel"
                      placeholder="+447700900000"
                      value={formData.emergencyContactPhone}
                      onChange={handleChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      Include country code (e.g., +44 for UK)
                    </p>
                  </div>
                </>
              )}

              {/* Step 4: About You */}
              {currentStep === 4 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="shortBio">Short Bio *</Label>
                    <Textarea
                      id="shortBio"
                      name="shortBio"
                      placeholder="Tell us a bit about yourself, your work, and what you're hoping to get from Ambitious Care..."
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
            ) : isSetup ? (
              <Link to="/setup-profile">
                <Button type="button" variant="ghost">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
            ) : (
              <div />
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

