import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, sendOtpToEmail, verifyEmailOtp, getProfile } from '../lib/supabaseClient'
import type { Profile } from '../types'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  profile: Profile | null
  refreshProfile: () => Promise<void>
  sendOtp: (email: string) => Promise<void>
  verifyOtp: (email: string, token: string) => Promise<void>
  signUp: (email: string, password: string, username?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const loadProfile = async (userId: string) => {
    try {
      const p = await getProfile(userId)
      setProfile(p)
    } catch {
      // Profile may not exist yet
      setProfile(null)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        loadProfile(currentUser.id)
      }
      setLoading(false)
    }).catch((error) => {
      console.error('Error fetching session:', error)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        loadProfile(currentUser.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Send OTP to email for login
  const sendOtp = async (email: string) => {
    await sendOtpToEmail(email)
  }

  // Verify OTP code and sign in
  const verifyOtp = async (email: string, token: string) => {
    await verifyEmailOtp(email, token)
  }

  // Sign up — since email confirmation is disabled, user is auto-signed-in
  const signUp = async (email: string, password: string, username?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
          full_name: username || email.split('@')[0],
        },
        // Don't require email confirmation
        emailRedirectTo: undefined,
      },
    })
    if (error) throw error

    // If email confirmation is disabled, Supabase returns a session immediately.
    // Manually set the auth state so React knows the user is logged in right away.
    if (data.session) {
      setSession(data.session)
      setUser(data.user)
    } else {
      // Fallback: try to sign in with password if no session was returned
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, refreshProfile, sendOtp, verifyOtp, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

