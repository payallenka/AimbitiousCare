import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import NotificationsBell from '@/components/NotificationsBell'

interface NavItem {
  label: string
  path: string
  disabled?: boolean
  category?: string
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, userProfile } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const getNavItems = (): NavItem[] => {
    if (userProfile?.user_role === 'patient') {
      return [
        { label: 'Dashboard', path: '/dashboard', category: 'Main' },
        { label: 'AI Chatbot', path: '/ai-chatbot', category: 'Main' },
        { label: 'Find Experts', path: '/experts', category: 'Main' },
        { label: 'Messages', path: '/chat', category: 'Main' },
        { label: 'Book Appointment', path: '/book-appointment', category: 'Appointments' },
        { label: 'My Appointments', path: '/my-appointments', category: 'Appointments' },
        { label: 'Rapid Alert', path: '/rapid-alert', category: 'Emergency' },
        { label: 'Community Posts', path: '/posts', category: 'Community' },
        { label: 'Exclusive Deals', path: '/deals', category: 'Community' },
        { label: 'Interactive Avatar', path: '/interactive-avatar', category: 'Immersive' },
      ]
    }

    if (userProfile?.user_role === 'company') {
      return [
        { label: 'Dashboard', path: '/company/dashboard', category: 'Main' },
        { label: 'Employees', path: '/company/employees', category: 'Company' },
        { label: 'Analytics', path: '/analytics', category: 'Insights' },
      ]
    }

    const sharedProfessionalItems: NavItem[] = [
      { label: 'Dashboard', path: '/dashboard', category: 'Main' },
      { label: 'Messages', path: '/chat', category: 'Main' },
      { label: 'My Availability', path: '/availability', category: 'Schedule' },
      { label: 'Appointment Inbox', path: '/appointment-inbox', category: 'Schedule' },
      { label: 'Community Posts', path: '/posts', category: 'Community' },
      { label: 'Exclusive Deals', path: '/deals', category: 'Community' },
      { label: 'Analytics', path: '/analytics', category: 'Insights' },
    ]

    if (userProfile?.user_role === 'therapist') {
      return [
        ...sharedProfessionalItems,
        { label: 'Rapid Alert Inbox', path: '/rapid-alert-inbox', category: 'Emergency' },
      ]
    }

    return sharedProfessionalItems
  }

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const navItems = getNavItems()
  const categories = Array.from(new Set(navItems.map((item) => item.category)))

  const handleNavigate = (path: string) => {
    if (!path) return
    navigate(path)
    setMobileOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="fixed top-4 left-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-black/10 bg-white/90 text-black shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-black lg:hidden"
      >
        <span className="space-y-1.5">
          <span className="block h-0.5 w-6 bg-black" />
          <span className="block h-0.5 w-6 bg-black" />
          <span className="block h-0.5 w-6 bg-black" />
        </span>
      </button>

      <div
        role="presentation"
        onClick={() => setMobileOpen(false)}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden',
          mobileOpen ? 'visible opacity-100' : 'invisible opacity-0'
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-white/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 lg:static lg:h-auto lg:translate-x-0 lg:bg-white/85 lg:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <span className="text-xl font-bold text-foreground">Ambitious Care</span>
          <div className="flex items-center gap-2">
          <NotificationsBell />
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 bg-white text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-black lg:hidden"
          >
            <span className="sr-only">Close navigation</span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {categories.map((category) => (
            <div key={category} className="mb-6">
              <div className="px-6 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {category}
                </span>
              </div>
              <div className="space-y-1 px-3">
                {navItems
                  .filter((item) => item.category === category)
                  .map((item) => {
                    const isActive =
                      location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                    const isRapidAlert = item.label === 'Rapid Alert' || item.label === 'Rapid Alert Inbox'
                    return (
                      <button
                        key={item.path}
                        onClick={() => !item.disabled && handleNavigate(item.path)}
                        disabled={item.disabled}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                          isRapidAlert
                            ? isActive
                              ? 'bg-red-600 text-white shadow-lg hover:bg-red-700'
                              : 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                            : isActive 
                              ? 'bg-black text-white shadow-lg' 
                              : 'text-black hover:bg-white/70',
                          item.disabled && 'opacity-60'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg border text-[10px] font-semibold tracking-[0.3em] shadow-sm',
                            isRapidAlert
                              ? 'border-red-700 bg-red-700 text-white shadow-lg'
                              : 'border-black/15 bg-white/70 text-black',
                            isActive && !isRapidAlert && 'shadow-lg shadow-black/10'
                          )}
                        >
                          {item.label.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="flex-1 text-left">{item.label}</span>
                      </button>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3">
          <button
            onClick={() => handleNavigate('/profile')}
            className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              {userProfile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 overflow-hidden text-left">
              <div className="truncate font-bold text-foreground">{userProfile?.full_name || 'User'}</div>
              <div className="truncate text-xs text-muted-foreground capitalize">{userProfile?.user_role === 'patient' ? 'User' : userProfile?.user_role?.replace(/_/g, ' ')}</div>
            </div>
          </button>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold transition-colors hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

