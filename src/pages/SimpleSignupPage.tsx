import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { validateEmail, validatePassword } from '@/lib/utils'
import { toast } from 'sonner'

export default function SimpleSignupPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      confirmPassword: '',
    }

    if (!formData.email) {
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

    setErrors(newErrors)
    return !Object.values(newErrors).some((error) => error !== '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/setup-profile`,
        },
      })

      if (authError) throw authError

      if (authData?.user) {
        toast.success('Account created! Please check your email to verify.')
        navigate('/verify-email')
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      toast.error(error.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const passwordRequirements = [
    { text: 'At least 8 characters', met: formData.password.length >= 8 },
    { text: 'One uppercase letter', met: /[A-Z]/.test(formData.password) },
    { text: 'One lowercase letter', met: /[a-z]/.test(formData.password) },
    { text: 'One number', met: /[0-9]/.test(formData.password) },
  ]

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Benefits */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:block"
        >
          <div className="space-y-8">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-7xl font-bold text-black font-bold mb-4"
              >
                Join Us Today
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl text-gray-700 font-medium"
              >
                Start your wellness journey with Ambitious Care
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              {[
                { title: 'Quick Setup', desc: 'Create your account in under 2 minutes' },
                { title: 'Instant Access', desc: 'Immediate access to all features' },
                { title: 'Secure & Private', desc: 'Your data is encrypted and protected' },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="modern-card p-6"
                >
                  <h3 className="text-xl font-bold text-black mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 font-medium">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side - Signup Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="elevated-card p-10">
            {/* Mobile Brand */}
            <div className="lg:hidden mb-8 text-center">
              <h1 className="text-5xl font-bold text-black font-bold mb-2">
                Create Account
              </h1>
              <p className="text-gray-700 font-medium">
                Join Ambitious Care
              </p>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block mb-8">
              <h2 className="text-4xl font-bold text-black font-bold mb-2">
                Create Account
              </h2>
              <p className="text-gray-700 text-lg font-medium">
                Get started with Ambitious Care
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-bold text-gray-800">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={`h-14 text-base ${errors.email ? 'border-red-400' : ''}`}
                />
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 font-medium"
                  >
                    {errors.email}
                  </motion.p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-bold text-gray-800">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`h-14 text-base pr-24 ${errors.password ? 'border-red-400' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-black hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 font-medium"
                  >
                    {errors.password}
                  </motion.p>
                )}

                {/* Password Requirements */}
                {formData.password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2 mt-3 p-4 bg-white/50 rounded-xl"
                  >
                    <p className="text-xs font-bold text-gray-700 mb-2">Password must have:</p>
                    {passwordRequirements.map((req, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${req.met ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className={`text-xs font-medium ${req.met ? 'text-green-700' : 'text-gray-600'}`}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-base font-bold text-gray-800">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`h-14 text-base pr-24 ${errors.confirmPassword ? 'border-red-400' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-black hover:text-gray-700 transition-colors"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 font-medium"
                  >
                    {errors.confirmPassword}
                  </motion.p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-16 text-lg font-bold"
                size="xl"
              >
                {loading ? (
                  <span className="flex items-center gap-3">
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/70 backdrop-blur-lg text-gray-600 font-bold">
                  Already have an account?
                </span>
              </div>
            </div>

            {/* Login Link */}
            <Link to="/login">
              <Button variant="outline" className="w-full h-14 font-bold text-base">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Footer Note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-6 text-sm text-gray-600"
          >
            By creating an account, you agree to our{' '}
            <a href="#" className="text-black hover:underline font-bold">
              Terms
            </a>{' '}
            and{' '}
            <a href="#" className="text-black hover:underline font-bold">
              Privacy Policy
            </a>
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
