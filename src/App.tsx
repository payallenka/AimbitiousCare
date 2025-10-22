import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Pages
import LoginPage from './pages/LoginPage'
import SimpleSignupPage from './pages/SimpleSignupPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import SetupProfilePage from './pages/SetupProfilePage'
import PatientRegistrationPage from './pages/PatientRegistrationPage'
import ProfessionalRegistrationPage from './pages/ProfessionalRegistrationPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ExpertsPage from './pages/ExpertsPage'
import ChatListPage from './pages/ChatListPage'
import ChatPage from './pages/ChatPage'
import AIChatbotPage from './pages/AIChatbotPage'
import ProfessionalAvailabilityPage from './pages/ProfessionalAvailabilityPage'
import AppointmentInboxPage from './pages/AppointmentInboxPage'
import BookAppointmentPage from './pages/BookAppointmentPage'
import PatientAppointmentsPage from './pages/PatientAppointmentsPage'
import PostsPage from './pages/PostsPage'
import DealsPage from './pages/DealsPage'

const queryClient = new QueryClient()

function ProtectedRoute({ children, requiresProfile = true }: { children: React.ReactNode; requiresProfile?: boolean }) {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center cosmic-bg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If the route requires a profile and user doesn't have one, redirect to setup
  if (requiresProfile && !userProfile) {
    return <Navigate to="/setup-profile" replace />
  }

  // If on setup route but already has profile, redirect to dashboard
  if (!requiresProfile && userProfile) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center cosmic-bg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (user && userProfile) {
    return <Navigate to="/dashboard" replace />
  }

  if (user && !userProfile) {
    return <Navigate to="/setup-profile" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <SimpleSignupPage />
          </PublicRoute>
        }
      />
      <Route
        path="/verify-email"
        element={
          <PublicRoute>
            <VerifyEmailPage />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />
      <Route
        path="/setup-profile"
        element={
          <ProtectedRoute requiresProfile={false}>
            <SetupProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup/patient"
        element={
          <ProtectedRoute requiresProfile={false}>
            <PatientRegistrationPage isSetup={true} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup/professional/:role"
        element={
          <ProtectedRoute requiresProfile={false}>
            <ProfessionalRegistrationPage isSetup={true} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-chatbot"
        element={
          <ProtectedRoute>
            <AIChatbotPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/experts"
        element={
          <ProtectedRoute>
            <ExpertsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:conversationId"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/availability"
        element={
          <ProtectedRoute>
            <ProfessionalAvailabilityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointment-inbox"
        element={
          <ProtectedRoute>
            <AppointmentInboxPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/book-appointment"
        element={
          <ProtectedRoute>
            <BookAppointmentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-appointments"
        element={
          <ProtectedRoute>
            <PatientAppointmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/posts"
        element={
          <ProtectedRoute>
            <PostsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/deals"
        element={
          <ProtectedRoute>
            <DealsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AppRoutes />
          <Toaster 
            position="top-right" 
            richColors 
            theme="dark"
            toastOptions={{
              style: {
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              },
            }}
          />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App

