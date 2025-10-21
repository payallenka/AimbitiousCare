import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Brain, LogOut, User, Users, MessageCircle, Home, Calendar, FileText, Gift, Sparkles } from 'lucide-react'

export default function DashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userProfile, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const navItems = [
    { label: 'Dashboard', icon: Home, path: '/dashboard' },
    { label: 'AI Chatbot', icon: Sparkles, path: '/ai-chatbot' },
    { label: 'Experts', icon: Users, path: '/experts' },
    { label: 'Chat', icon: MessageCircle, path: '/chat' },
    { label: 'Appointments', icon: Calendar, path: '/appointments', disabled: true },
    { label: 'Posts', icon: FileText, path: '/posts', disabled: true },
    { label: 'Deals', icon: Gift, path: '/deals', disabled: true },
  ]

  return (
    <div className="min-h-screen cosmic-bg">
      {/* Navigation */}
      <nav className="glass-card border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-heading font-bold gradient-text">
                Ambitious Care
              </span>
            </div>

            {/* Nav Items */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    size="sm"
                    onClick={() => !item.disabled && navigate(item.path)}
                    disabled={item.disabled}
                    className={`${isActive ? 'bg-primary/10 text-primary' : ''}`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                )
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-heading font-bold mb-2">
            Welcome back, {userProfile?.full_name}!
          </h1>
          <p className="text-muted-foreground mb-8">
            Account type: <span className="text-primary capitalize">{userProfile?.user_role.replace('_', ' ')}</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="glass-card rounded-2xl p-8 cursor-pointer bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20"
              onClick={() => navigate('/ai-chatbot')}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary via-accent to-primary/60 mb-4 animate-pulse">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-heading font-semibold mb-2 gradient-text">
                AI Chatbot
              </h2>
              <p className="text-muted-foreground">
                Chat with an AI therapist 24/7. Confidential, understanding support anytime you need it.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="glass-card rounded-2xl p-8 cursor-pointer"
              onClick={() => navigate('/experts')}
            >
              <Users className="w-12 h-12 text-primary mb-4" />
              <h2 className="text-2xl font-heading font-semibold mb-2">
                Find Experts
              </h2>
              <p className="text-muted-foreground">
                Browse and connect with mental health professionals who can help you.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="glass-card rounded-2xl p-8 cursor-pointer"
              onClick={() => navigate('/chat')}
            >
              <MessageCircle className="w-12 h-12 text-primary mb-4" />
              <h2 className="text-2xl font-heading font-semibold mb-2">
                Messages
              </h2>
              <p className="text-muted-foreground">
                View and manage your conversations with experts.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="glass-card rounded-2xl p-8 cursor-pointer"
              onClick={() => navigate('/profile')}
            >
              <User className="w-12 h-12 text-primary mb-4" />
              <h2 className="text-2xl font-heading font-semibold mb-2">
                My Profile
              </h2>
              <p className="text-muted-foreground">
                View and edit your personal information and account details.
              </p>
            </motion.div>

            <div className="glass-card rounded-2xl p-8 opacity-50">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-heading font-semibold mb-2">
                Appointments
              </h2>
              <p className="text-muted-foreground">
                Book and manage your appointments with experts. (Coming Soon)
              </p>
            </div>

            <div className="glass-card rounded-2xl p-8 opacity-50">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-heading font-semibold mb-2">
                Posts & Resources
              </h2>
              <p className="text-muted-foreground">
                Mental health articles and community posts. (Coming Soon)
              </p>
            </div>

            <div className="glass-card rounded-2xl p-8 opacity-50">
              <Gift className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-heading font-semibold mb-2">
                Exclusive Deals
              </h2>
              <p className="text-muted-foreground">
                Special offers and wellness deals. (Coming Soon)
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

