import { createContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string, mounted: { current: boolean }) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) console.error('[auth] failed to load profile:', error)
      if (mounted.current) setProfile(data ?? null)
    } catch (err) {
      console.error('[auth] profile fetch threw:', err)
      if (mounted.current) setProfile(null)
    }
  }

  useEffect(() => {
    const mounted = { current: true }

    // Fallback: if Supabase never fires, unblock after 5s
    const timeout = setTimeout(() => {
      if (mounted.current) setLoading(false)
    }, 5000)

    // onAuthStateChange always fires INITIAL_SESSION immediately with the
    // current session from localStorage — no network call needed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted.current) return

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          await fetchProfile(newSession.user.id, mounted)
        } else {
          setProfile(null)
        }

        if (!mounted.current) return
        clearTimeout(timeout)
        setLoading(false)
      }
    )

    return () => {
      mounted.current = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signInWithMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      isAdmin: profile?.role === 'admin',
      signIn,
      signInWithMagicLink,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
