import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoadingScreen from './components/LoadingScreen'

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
import MockPaymentPage from './pages/MockPaymentPage'
import PatientAppointmentsPage from './pages/PatientAppointmentsPage'
import PostsPage from './pages/PostsPage'
import DealsPage from './pages/DealsPage'
import RapidAlertPage from './pages/RapidAlertPage'
import RapidAlertInboxPage from './pages/RapidAlertInboxPage'
import CompanyRegistrationPage from './pages/CompanyRegistrationPage'
import CompanySubscriptionPage from './pages/CompanySubscriptionPage'
import CompanyDashboardPage from './pages/CompanyDashboardPage'
import CompanyEmployeesPage from './pages/CompanyEmployeesPage'
import AnalyticsPage from './pages/AnalyticsPage'
import InteractiveAvatarPage from './pages/InteractiveAvatarPage'
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage'
import AdminDisputesPage from './pages/AdminDisputesPage'

const queryClient = new QueryClient()

function ProtectedRoute({
  children,
  requiresProfile = true,
  allowedRoles,
  allowSuperAdmin = false,
}: {
  children: React.ReactNode
  requiresProfile?: boolean
  allowedRoles?: string[]
  allowSuperAdmin?: boolean
}) {
  const { user, userProfile, loading, isSuperAdmin } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (isSuperAdmin) {
    if (!allowSuperAdmin) {
      return <Navigate to="/admin" replace />
    }
    requiresProfile = false
  }

  // If the route requires a profile and user doesn't have one, redirect to setup
  if (requiresProfile && !userProfile) {
    return <Navigate to="/setup-profile" replace />
  }

  if (!isSuperAdmin && allowedRoles && userProfile && !allowedRoles.includes(userProfile.user_role)) {
    return <Navigate to="/dashboard" replace />
  }

  // If on setup route but already has profile, redirect to dashboard
  if (!isSuperAdmin && !requiresProfile && userProfile) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading, isSuperAdmin } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (user && isSuperAdmin) {
    return <Navigate to="/admin" replace />
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
        path="/mock-payment"
        element={
          <ProtectedRoute>
            <MockPaymentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interactive-avatar"
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <InteractiveAvatarPage />
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
      <Route
        path="/rapid-alert"
        element={
          <ProtectedRoute>
            <RapidAlertPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rapid-alert-inbox"
        element={
          <ProtectedRoute>
            <RapidAlertInboxPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup/company"
        element={
          <ProtectedRoute requiresProfile={false}>
            <CompanyRegistrationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/select-plan"
        element={
          <ProtectedRoute>
            <CompanySubscriptionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/dashboard"
        element={
          <ProtectedRoute>
            <CompanyDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/employees"
        element={
          <ProtectedRoute>
            <CompanyEmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiresProfile={false} allowSuperAdmin>
            <SuperAdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/disputes"
        element={
          <ProtectedRoute requiresProfile={false} allowSuperAdmin>
            <AdminDisputesPage />
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
            theme="light"
            closeButton
            duration={3000}
            toastOptions={{
              style: {
                background: 'rgba(255, 248, 240, 0.92)',
                backdropFilter: 'blur(18px)',
                border: '1px solid rgba(0, 0, 0, 0.14)',
                color: '#111111',
                fontWeight: 600,
                boxShadow: '0 12px 38px rgba(0, 0, 0, 0.12)',
                borderRadius: '16px',
              },
              className: 'glass-card',
            }}
          />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App

