import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateEmail } from '@/lib/utils'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({
    email: '',
    password: '',
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
    }

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some((error) => error !== '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      await signIn(formData.email, formData.password)
      navigate('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
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
                Ambitious Care
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl text-gray-700 font-medium"
              >
                Mental health support for construction workers
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              {[
                { title: 'Professional Support', desc: 'Connect with licensed therapists' },
                { title: '24/7 AI Assistance', desc: 'Always available when you need help' },
                { title: 'Complete Privacy', desc: 'Your conversations are confidential' },
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

        {/* Right Side - Login Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="elevated-card p-10">
            {/* Mobile Brand */}
            <div className="lg:hidden mb-8 text-center">
              <h1 className="text-5xl font-bold text-black font-bold mb-2">
                Ambitious Care
              </h1>
              <p className="text-gray-700 font-medium">
                Sign in to continue
              </p>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block mb-8">
              <h2 className="text-4xl font-bold text-black font-bold mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-700 text-lg font-medium">
                Sign in to your account
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
                    placeholder="Enter your password"
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
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm font-bold text-black hover:text-gray-700 hover:underline transition-all"
                >
                  Forgot password?
                </Link>
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
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
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
                  New to Ambitious Care?
                </span>
              </div>
            </div>

            {/* Register Link */}
            <Link to="/register">
              <Button variant="outline" className="w-full h-14 font-bold text-base">
                Create Account
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
            By signing in, you agree to our{' '}
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
