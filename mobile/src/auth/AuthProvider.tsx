import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../shared/supabaseClient'

type Role = 'SHIPPER' | 'DRIVER' | 'OPERATOR'

type Profile = {
  id: string
  role: Role
  full_name: string | null
  phone: string | null
}

type AuthState = {
  loading: boolean
  session: Session | null
  profile: Profile | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone')
      .eq('id', userId)
      .single()

    if (error) throw error
    setProfile(data as Profile)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session ?? null)
      if (data.session?.user?.id) {
        await loadProfile(data.session.user.id)
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      if (s?.user?.id) {
        await loadProfile(s.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      profile,
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }),
    [loading, session, profile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
