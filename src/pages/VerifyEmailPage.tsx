import { motion } from 'framer-motion'
import { Brain, Mail, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen cosmic-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full glass-card mb-4"
          >
            <Brain className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-4xl font-heading font-bold text-black font-bold mb-2">
            Ambitious Care
          </h1>
          <p className="text-muted-foreground">
            Mental health for construction workers
          </p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-card rounded-2xl p-8 shadow-2xl text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Mail className="w-10 h-10 text-primary" />
          </div>

          <h2 className="text-3xl font-heading font-bold mb-4">
            Check Your Email!
          </h2>

          <p className="text-muted-foreground mb-6">
            We've sent a verification link to your email address. Click the link to
            verify your account and complete your profile setup.
          </p>

          <div className="space-y-3 mb-8 text-left">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Step 1: Check your inbox</p>
                <p className="text-sm text-muted-foreground">
                  Look for an email from Ambitious Care
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Step 2: Click the verification link</p>
                <p className="text-sm text-muted-foreground">
                  This confirms your email address
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Step 3: Complete your profile</p>
                <p className="text-sm text-muted-foreground">
                  You'll be directed to finish setting up your account
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 mb-6">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Didn't receive the email?</strong>
              <br />
              Check your spam folder or try signing up again.
            </p>
          </div>

          <Link to="/login">
            <Button variant="outline" className="w-full">
              Back to Login
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}

