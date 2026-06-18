import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import RegisterPage from './RegisterPage'

// This page shows after email verification
// It's for authenticated users who haven't completed their profile yet

export default function SetupProfilePage() {
  // Routing logic is now handled by ProtectedRoute in App.tsx
  // This page only renders if user is logged in AND has no profile
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen cosmic-bg">
      {/* Sign out — so a logged-in user (or a stale session) isn't trapped here */}
      <div className="flex justify-end px-6 pt-4">
        <button
          onClick={() => signOut()}
          className="inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white/80 px-4 py-2 text-sm font-medium text-black hover:bg-black hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      <div className="py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full glass-card mb-4">

          </div>
          <h1 className="text-3xl font-heading font-bold text-black font-bold mb-2">
            Welcome to Ambitious Care!
          </h1>
          <p className="text-muted-foreground">
            Let's set up your profile. Choose your account type below.
          </p>
        </div>

        <RegisterPage isSetup={true} />
      </div>
    </div>
  )
}
