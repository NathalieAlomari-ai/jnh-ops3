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

  // Fetch profile whenever the user id changes.
  // IMPORTANT: this runs OUTSIDE the onAuthStateChange callback. Calling supabase
  // inside that callback deadlocks the auth client (known supabase-js issue).
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('[auth] failed to load profile:', error)
        setProfile((data as Profile | null) ?? null)
      })
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    let mounted = true

    // Fallback: if Supabase never fires, unblock after 5s
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

    // Hydrate initial session without depending on the auth-state event.
    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      if (!mounted) return
      setSession(initial)
      setUser(initial?.user ?? null)
      clearTimeout(timeout)
      setLoading(false)
    })

    // Subsequent auth changes (sign-in, sign-out, token refresh).
    // Keep this callback SYNCHRONOUS — do NOT await supabase calls here.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return
        setSession(newSession)
        setUser(newSession?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const isAdmin = profile?.role === 'admin'

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  async function signInWithMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({ email })
    return { error: error as Error | null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, isAdmin, signIn, signInWithMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}