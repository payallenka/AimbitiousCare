import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User } from '@/lib/supabase'
import { toast } from 'sonner'

interface AuthContextType {
  user: SupabaseUser | null
  userProfile: User | null
  loading: boolean
  isSuperAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const superAdminEmails = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || import.meta.env.VITE_SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean)

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', userId)
        .maybeSingle() // Returns null if no row found instead of throwing error

      // If no profile exists yet, that's okay - user needs to complete registration
      if (error) {
        console.error('Error fetching user profile:', error)
        setUserProfile(null)
        return
      }
      
      setUserProfile(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUserProfile(null)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id)
    }
  }

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      }
      if (session?.user?.email) {
        setIsSuperAdmin(superAdminEmails.includes(session.user.email.toLowerCase()))
      } else {
        setIsSuperAdmin(false)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
        if (session.user.email) {
          setIsSuperAdmin(superAdminEmails.includes(session.user.email.toLowerCase()))
        } else {
          setIsSuperAdmin(false)
        }
      } else {
        setUserProfile(null)
        setIsSuperAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Admin is primarily decided by the user's role. The email allowlist remains
  // an optional fallback (used to bootstrap, and harmless when left empty).
  useEffect(() => {
    const email = user?.email?.toLowerCase()
    const byRole = userProfile?.user_role === 'admin'
    const byEmail = email ? superAdminEmails.includes(email) : false
    setIsSuperAdmin(byRole || byEmail)
  }, [user, userProfile])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        await fetchUserProfile(data.user.id)
        toast.success('Welcome back!', {
          description: 'You have successfully signed in.',
        })
      }
    } catch (error: any) {
      toast.error('Sign in failed', {
        description: error.message || 'Please check your credentials and try again.',
      })
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setUserProfile(null)
      setIsSuperAdmin(false)
      
      toast.success('Signed out', {
        description: 'You have been successfully signed out.',
      })
    } catch (error: any) {
      toast.error('Sign out failed', {
        description: error.message,
      })
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isSuperAdmin,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

