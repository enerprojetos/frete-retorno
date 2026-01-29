import React, { createContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/shared/lib/supabaseClient'
import type { UserRole } from './authRedirect'

export type ProfileRow = {
  id: string
  role: UserRole
  full_name: string
  phone: string
  created_at: string
  updated_at: string
}

type SignUpBase = {
  email: string
  password: string
  fullName: string
  phone: string
  role: Exclude<UserRole, 'OPERATOR'> // SHIPPER | DRIVER
}

type ShipperExtra = {
  companyName: string
  documentType: 'CNPJ' | 'CPF'
  documentNumber: string
  city: string
  state: string
  contactName: string
  contactPhone: string
}

type DriverExtra = {
  baseCity: string
  baseState: string
  cnhCategory: string
  yearsExperience: number
  vehicleLabel: string
  vehicleBodyType: string
  maxPayloadKg: number
  lengthM?: number | null
  widthM?: number | null
  heightM?: number | null
  hasWinch?: boolean
  hasCrane?: boolean
  notes?: string | null
}

type AuthState = {
  loading: boolean // ✅ só boot
  session: Session | null
  profile: ProfileRow | null

  signIn(email: string, password: string): Promise<ProfileRow | null>
  signUp(payload: SignUpBase & { shipper?: ShipperExtra; driver?: DriverExtra }): Promise<void>
  signOut(): Promise<void>

  refreshProfile(): Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as ProfileRow | null
}

async function fetchProfileWithTimeout(userId: string, timeoutMs = 8000): Promise<ProfileRow | null> {
  return await Promise.race([
    fetchProfile(userId),
    new Promise<ProfileRow | null>((_resolve, reject) =>
      setTimeout(() => reject(new Error('Timeout ao carregar perfil')), timeoutMs)
    ),
  ])
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ✅ loading só enquanto faz bootstrap inicial
  const [loading, setLoading] = useState(true)

  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)

  async function refreshProfile() {
    const { data } = await supabase.auth.getSession()
    const s = data.session
    if (!s?.user) {
      setProfile(null)
      return
    }

    const p = await fetchProfileWithTimeout(s.user.id)
    setProfile(p)
  }

  useEffect(() => {
    let mounted = true
    let seq = 0

    ;(async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error

        const s = data.session ?? null
        if (!mounted) return

        setSession(s)

        if (s?.user) {
          try {
            const p = await fetchProfileWithTimeout(s.user.id)
            if (!mounted) return
            setProfile(p)
          } catch (e) {
            if (!mounted) return
            console.error('fetchProfile error (boot):', e)
            setProfile(null)
          }
        } else {
          setProfile(null)
        }
      } catch (e) {
        console.error('getSession error:', e)
        if (!mounted) return
        setSession(null)
        setProfile(null)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      // ✅ nunca travar UI por evento de auth
      setSession(newSession ?? null)

      // se deslogou
      if (!newSession?.user) {
        setProfile(null)
        return
      }

      // refresh do perfil em background (sem loading global)
      const mySeq = ++seq
      try {
        const p = await fetchProfileWithTimeout(newSession.user.id)
        if (!mounted) return
        if (mySeq !== seq) return // descarta resposta antiga
        setProfile(p)
      } catch (e) {
        // mantém o app rodando; profile pode ficar null e ProtectedRoute mostra fallback
        console.error('fetchProfile error (state change):', e)
        if (!mounted) return
        if (mySeq !== seq) return
        setProfile((cur) => cur ?? null)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const userId = data.session?.user?.id
    if (!userId) throw new Error('Sessão inválida após login.')

    const p = await fetchProfileWithTimeout(userId)
    setProfile(p)
    return p
  }

  async function signUp(payload: SignUpBase & { shipper?: ShipperExtra; driver?: DriverExtra }) {
    const { error: signUpError } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          role: payload.role,
          full_name: payload.fullName,
          phone: payload.phone,
        },
      },
    })
    if (signUpError) throw signUpError

    const { error: signInError, data } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    })
    if (signInError) throw signInError

    const userId = data.session?.user.id
    if (!userId) throw new Error('Não foi possível obter o user id após login.')

    if (payload.role === 'SHIPPER') {
      if (!payload.shipper) throw new Error('Dados de empresa ausentes.')
      const s = payload.shipper

      const { error } = await supabase.from('shipper_profiles').upsert({
        user_id: userId,
        company_name: s.companyName,
        document_type: s.documentType,
        document_number: s.documentNumber,
        city: s.city,
        state: s.state,
        contact_name: s.contactName,
        contact_phone: s.contactPhone,
      })
      if (error) throw error
    }

    if (payload.role === 'DRIVER') {
      if (!payload.driver) throw new Error('Dados de motorista ausentes.')
      const d = payload.driver

      const { error: driverErr } = await supabase.from('driver_profiles').upsert({
        user_id: userId,
        base_city: d.baseCity,
        base_state: d.baseState,
        cnh_category: d.cnhCategory,
        years_experience: d.yearsExperience,
      })
      if (driverErr) throw driverErr

      const { error: vehicleErr } = await supabase.from('vehicles').insert({
        driver_user_id: userId,
        label: d.vehicleLabel,
        body_type: d.vehicleBodyType,
        max_payload_kg: d.maxPayloadKg,
        length_m: d.lengthM ?? null,
        width_m: d.widthM ?? null,
        height_m: d.heightM ?? null,
        has_winch: !!d.hasWinch,
        has_crane: !!d.hasCrane,
        notes: d.notes ?? null,
      })
      if (vehicleErr) throw vehicleErr
    }

    await refreshProfile()
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    // loading continua false
  }

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      profile,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [loading, session, profile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
