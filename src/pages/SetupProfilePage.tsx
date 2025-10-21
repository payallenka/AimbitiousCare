import { Brain } from 'lucide-react'
import RegisterPage from './RegisterPage'

// This page shows after email verification
// It's for authenticated users who haven't completed their profile yet

export default function SetupProfilePage() {
  // Routing logic is now handled by ProtectedRoute in App.tsx
  // This page only renders if user is logged in AND has no profile
  
  return (
    <div className="min-h-screen cosmic-bg">
      <div className="py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full glass-card mb-4">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-heading font-bold gradient-text mb-2">
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

