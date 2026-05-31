import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateEmail } from '@/lib/utils'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Email is required')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setSent(true)
      toast.success('Password reset email sent!')
    } catch (error: any) {
      console.error('Reset password error:', error)
      setError(error.message || 'Failed to send reset email')
      toast.error('Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Link to="/login">
            <Button variant="ghost" className="font-bold text-gray-700 hover:text-black">
              ← Back to Login
            </Button>
          </Link>
        </motion.div>

        {/* Card */}
        <div className="elevated-card p-10">
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6 shadow-xl">
                <span className="text-5xl">✓</span>
              </div>
              <h3 className="text-3xl font-bold text-black font-bold mb-4">
                Check Your Email
              </h3>
              <p className="text-gray-700 text-lg mb-2 font-medium">
                We've sent a password reset link to
              </p>
              <p className="text-black font-bold text-lg mb-8">
                {email}
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full h-14 text-base font-bold"
                size="lg"
              >
                Return to Login
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8 text-center">
                <h2 className="text-4xl font-bold text-black font-bold mb-3">
                  Forgot Password?
                </h2>
                <p className="text-gray-700 text-lg font-medium">
                  No worries! We'll send you reset instructions
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-bold text-gray-800">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError('')
                    }}
                    className={`h-14 text-base ${error ? 'border-red-400' : ''}`}
                  />
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600 font-medium"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-16 text-lg font-bold"
                  size="xl"
                >
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        {!sent && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-6 text-sm text-gray-600"
          >
            Remember your password?{' '}
            <Link to="/login" className="text-black hover:underline font-bold">
              Sign in
            </Link>
          </motion.p>
        )}
      </motion.div>
    </div>
  )
}
