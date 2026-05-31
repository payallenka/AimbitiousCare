import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  label: string
  path: string
  highlight?: boolean
  disabled?: boolean
}

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

  const { userProfile } = useAuth()

  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'AI Chatbot', path: '/ai-chatbot', highlight: true },
      { label: 'Experts', path: '/experts' },
      { label: 'Chat', path: '/chat' },
    ]

    if (userProfile?.user_role === 'patient') {
      return [
        ...baseItems,
        { label: 'Book Appointment', path: '/book-appointment' },
        { label: 'My Appointments', path: '/my-appointments' },
        { label: 'Rapid Alert', path: '/rapid-alert', highlight: true },
        { label: 'Posts', path: '/posts' },
        { label: 'Deals', path: '/deals' },
      ]
    } else if (userProfile?.user_role === 'company') {
      return [
        { label: 'Home', path: '/company/dashboard' },
        { label: 'Analytics', path: '/analytics', highlight: true },
      ]
    } else if (userProfile?.user_role === 'therapist') {
      return [
        ...baseItems,
        { label: 'Availability', path: '/availability' },
        { label: 'Appointment Inbox', path: '/appointment-inbox' },
        { label: 'Rapid Alert Inbox', path: '/rapid-alert-inbox', highlight: true },
        { label: 'Posts', path: '/posts' },
        { label: 'Deals', path: '/deals' },
        { label: 'Analytics', path: '/analytics', highlight: true },
      ]
    } else {
      return [
        ...baseItems,
        { label: 'Availability', path: '/availability' },
        { label: 'Appointment Inbox', path: '/appointment-inbox' },
        { label: 'Posts', path: '/posts' },
        { label: 'Deals', path: '/deals' },
        { label: 'Analytics', path: '/analytics', highlight: true },
      ]
    }
  }

  const navItems = getNavItems()

  return (
    <nav className="navbar">
      <div className="section-container">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div 
            className="cursor-pointer group flex items-center gap-3" 
            onClick={() => navigate('/dashboard')}
          >
            <span className="text-2xl font-bold gradient-text smooth-transition">
              Ambitious Care
            </span>
          </div>

          {/* Nav Items */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              const isRapidAlert = item.label === 'Rapid Alert' || item.label === 'Rapid Alert Inbox'
              return (
                <button
                  key={item.path}
                  onClick={() => !item.disabled && navigate(item.path)}
                  disabled={item.disabled}
                  className={`
                    px-4 py-2 rounded-lg font-semibold text-sm smooth-transition
                    ${
                      isActive 
                        ? isRapidAlert
                          ? 'bg-red-600 text-white shadow-sm hover:bg-red-700'
                          : 'bg-primary text-primary-foreground shadow-sm'
                        : isRapidAlert
                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                        : item.highlight 
                        ? 'bg-accent/10 text-accent hover:bg-accent/20' 
                        : 'text-foreground hover:bg-secondary'
                    }
                  `}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/profile')}
              className="px-4 py-2 rounded-lg font-semibold text-sm text-foreground hover:bg-secondary smooth-transition"
            >
              {userProfile?.full_name || 'Profile'}
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-lg font-semibold text-sm border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 smooth-transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
