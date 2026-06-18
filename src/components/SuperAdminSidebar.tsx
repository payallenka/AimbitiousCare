import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface AdminNavItem {
  label: string
  target: string
}

const adminNavItems: AdminNavItem[] = [
  { label: 'Overview', target: 'overview' },
  { label: 'User Metrics', target: 'user-metrics' },
  { label: 'Users Management', target: 'users-management' },
  { label: 'Experts Management', target: 'experts-management' },
  { label: 'Companies', target: 'companies-management' },
  { label: 'Employees', target: 'employees-management' },
  { label: 'Posts Management', target: 'posts-management' },
  { label: 'Rapid Alerts', target: 'rapid-alerts-management' },
  { label: 'Subscriptions', target: 'subscriptions-management' },
  { label: 'Deals & Offers', target: 'deals-management' },
  { label: 'Resources', target: 'resources-management' },
  { label: 'Invitations', target: 'admin-invitations' },
]

export default function SuperAdminSidebar() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleScroll = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setMobileOpen(false)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setMobileOpen(false)
    } catch (error) {
      console.error('Sign out error:', error)
    }
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
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-black/10 bg-white/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 lg:static lg:h-auto lg:translate-x-0 lg:bg-white/85 lg:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-black/10">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-black/40">AmbitiousCare</p>
            <h1 className="text-xl font-heading font-semibold text-black mt-1">Super Admin</h1>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 bg-white text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-black lg:hidden"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <div className="space-y-2 px-4">
            {/* Dedicated route (not an in-page scroll target) */}
            <button
              onClick={() => { navigate('/admin/disputes'); setMobileOpen(false) }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white bg-black transition-colors hover:bg-black/80"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-[10px] font-semibold tracking-[0.2em] text-white">
                DS
              </span>
              <span>Disputes &amp; Safety</span>
            </button>

            {adminNavItems.map((item) => (
              <button
                key={item.target}
                onClick={() => handleScroll(item.target)}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-black/10"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/15 bg-white/70 text-[10px] font-semibold tracking-[0.3em] text-black shadow-sm">
                  {item.label.slice(0, 2).toUpperCase()}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="border-t border-black/10 p-4">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-black/45 mb-1">Signed In</p>
            <p className="text-sm font-semibold text-black truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg border border-black/15 px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

