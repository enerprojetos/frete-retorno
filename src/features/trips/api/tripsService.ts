import { supabase } from '@/shared/lib/supabaseClient'

export type TripInput = {
  driverId: string
  origin: { label: string; lat: number; lng: number }
  destination: { label: string; lat: number; lng: number }
  corridorRadiusM: number
  profile?: 'driving-car' | 'driving-hgv'
}

export type TripRow = {
  id: string
  driver_id: string
  driver_user_id?: string | null
  origin_label: string
  destination_label: string
  corridor_radius_m: number
  profile: string
  route_distance_m: number | null
  route_duration_s: number | null
  status: 'OPEN' | 'CANCELLED'
  created_at: string
}

export type TripUiRow = TripRow & {
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
}

export type TripMatch = {
  freight_id: string
  pickup_dist_m: number
  dropoff_dist_m: number
  pickup_pos: number
  dropoff_pos: number
  score: number
}

const FUNCTIONS_URL = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined) ?? ''
const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

async function buildFunctionHeaders() {
  const h: Record<string, string> = { 'content-type': 'application/json' }

  if (ANON_KEY) h.apikey = ANON_KEY

  // Preferir JWT do usuário logado (mais correto). Se não houver, fallback pro anon.
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token ?? ANON_KEY
  if (token) h.Authorization = `Bearer ${token}`

  return h
}

export async function createTripViaFunction(input: TripInput) {
  if (!FUNCTIONS_URL) throw new Error('Missing VITE_SUPABASE_FUNCTIONS_URL')

  const url = `${FUNCTIONS_URL}/trips-create`
  const resp = await fetch(url, {
    method: 'POST',
    headers: await buildFunctionHeaders(),
    body: JSON.stringify({
      driverId: input.driverId,
      origin: input.origin,
      destination: input.destination,
      corridorRadiusM: input.corridorRadiusM,
      profile: input.profile ?? 'driving-car',
    }),
  })

  const json = await resp.json().catch(() => null)
  if (!resp.ok) throw new Error(json?.detail ?? json?.error ?? `Failed (HTTP ${resp.status})`)
  return (json?.trip ?? json) as TripRow
}

export async function updateTripViaFunction(params: {
  tripId: string
  actorUserId: string
  origin: { label: string; lat: number; lng: number }
  destination: { label: string; lat: number; lng: number }
  corridorRadiusM: number
  profile: 'driving-car' | 'driving-hgv'
}) {
  if (!FUNCTIONS_URL) throw new Error('Missing VITE_SUPABASE_FUNCTIONS_URL')

  const url = `${FUNCTIONS_URL}/trips-update`
  const resp = await fetch(url, {
    method: 'POST',
    headers: await buildFunctionHeaders(),
    body: JSON.stringify(params),
  })

  const json = await resp.json().catch(() => null)
  if (!resp.ok) throw new Error(json?.detail ?? json?.error ?? `Failed (HTTP ${resp.status})`)
  return (json?.trip ?? json) as TripRow
}

export async function getTripMatchesViaFunction(tripId: string, limit = 50) {
  if (!FUNCTIONS_URL) throw new Error('Missing VITE_SUPABASE_FUNCTIONS_URL')

  const url = `${FUNCTIONS_URL}/trips-matches`
  const resp = await fetch(url, {
    method: 'POST',
    headers: await buildFunctionHeaders(),
    body: JSON.stringify({ tripId, limit }),
  })

  const json = await resp.json().catch(() => null)
  if (!resp.ok) throw new Error(json?.detail ?? json?.error ?? `Failed (HTTP ${resp.status})`)
  return (json?.matches ?? json ?? []) as TripMatch[]
}

export async function listMyTrips(params?: { limit?: number; status?: '' | 'OPEN' | 'CANCELLED'; q?: string }) {
  const limit = params?.limit ?? 100

  let query = supabase
    .from('trip')
    .select('id,origin_label,destination_label,status,created_at,corridor_radius_m,route_distance_m,route_duration_s,profile')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (params?.status) query = query.eq('status', params.status)

  const q = (params?.q ?? '').trim()
  if (q) query = query.or(`origin_label.ilike.%${q}%,destination_label.ilike.%${q}%`)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as TripRow[]
}

export async function getTripById(tripId: string) {
  const { data, error } = await supabase
    .from('trip_ui')
    .select('*')
    .eq('id', tripId)
    .single()

  if (error) throw error
  return data as TripUiRow
}

export async function cancelTrip(tripId: string) {
  const { data, error } = await supabase
    .from('trip')
    .update({ status: 'CANCELLED' })
    .eq('id', tripId)
    .select('id,origin_label,destination_label,status,created_at,corridor_radius_m,route_distance_m,route_duration_s,profile')
    .single()

  if (error) throw error
  return data as TripRow
}
