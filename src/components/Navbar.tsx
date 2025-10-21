import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Brain, LogOut, User, Users, MessageCircle, Home, Calendar, FileText, Gift, Sparkles } from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const navItems = [
    { label: 'Dashboard', icon: Home, path: '/dashboard' },
    { label: 'AI Chatbot', icon: Sparkles, path: '/ai-chatbot', highlight: true },
    { label: 'Experts', icon: Users, path: '/experts' },
    { label: 'Chat', icon: MessageCircle, path: '/chat' },
    { label: 'Appointments', icon: Calendar, path: '/appointments', disabled: true },
    { label: 'Posts', icon: FileText, path: '/posts', disabled: true },
    { label: 'Deals', icon: Gift, path: '/deals', disabled: true },
  ]

  return (
    <nav className="glass-card border-b border-border/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
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
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  onClick={() => !item.disabled && navigate(item.path)}
                  disabled={item.disabled}
                  className={`${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : item.highlight 
                      ? 'bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20' 
                      : ''
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-2 ${item.highlight ? 'animate-pulse' : ''}`} />
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
  )
}

