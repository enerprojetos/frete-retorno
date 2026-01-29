import { supabase } from '@/shared/lib/supabaseClient'

export type FreightStatus = 'OPEN' | 'CLOSED'

export type FreightInput = {
  shipperId: string
  pickup: { label: string; lat: number; lng: number; radiusM?: number }
  dropoff: { label: string; lat: number; lng: number; radiusM?: number }
  notes?: string | null

  // NOVOS
  distanceM?: number | null
  durationS?: number | null
  priceTotalCents?: number | null
  driverPayoutCents?: number | null
  currency?: string
}


export type FreightRow = {
  id: string
  shipper_id: string
  pickup_label: string
  dropoff_label: string
  pickup_radius_m: number
  dropoff_radius_m: number
  notes: string | null
  status: FreightStatus
  created_at: string
}

/** Row para UI (com lat/lng extraídos via view `freight_ui`) */
export type FreightUiRow = FreightRow & {
  shipper_user_id?: string | null
  pickup_lat: number
  pickup_lng: number
  dropoff_lat: number
  dropoff_lng: number
}

export type FreightUpdateInput = {
  pickup: { label: string; lat: number; lng: number; radiusM?: number }
  dropoff: { label: string; lat: number; lng: number; radiusM?: number }
  notes?: string | null
}

export async function createFreight(input: FreightInput) {
  const distanceM = input.distanceM == null ? null : Math.max(0, Math.round(input.distanceM))
  const durationS = input.durationS == null ? null : Math.max(0, Math.round(input.durationS))

  const { data, error } = await supabase.rpc('create_freight', {
    p_shipper_id: input.shipperId,
    p_pickup_label: input.pickup.label,
    p_pickup_lng: input.pickup.lng,
    p_pickup_lat: input.pickup.lat,
    p_dropoff_label: input.dropoff.label,
    p_dropoff_lng: input.dropoff.lng,
    p_dropoff_lat: input.dropoff.lat,
    p_pickup_radius_m: input.pickup.radiusM ?? 0,
    p_dropoff_radius_m: input.dropoff.radiusM ?? 0,
    p_notes: input.notes ?? null,

    // NOVOS
    p_distance_m: distanceM,
    p_duration_s: durationS,
    p_price_total_cents: input.priceTotalCents ?? null,
    p_driver_payout_cents: input.driverPayoutCents ?? null,
    p_currency: input.currency ?? 'BRL',
  })

  if (error) throw error
  return data as FreightRow
}


// -----------------------------------------------------------------------------
// LEGACY (demo): lista direto da tabela. Mantemos para não quebrar as telas /demo.
// -----------------------------------------------------------------------------
export async function listFreights(limit = 50) {
  const { data, error } = await supabase
    .from('freight')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as FreightRow[]
}

export async function listMyFreights(params?: {
  limit?: number
  status?: '' | FreightStatus
  q?: string
}) {
  const limit = params?.limit ?? 50

  let query = supabase
    .from('freight_ui')
    .select(
      'id,shipper_id,shipper_user_id,status,created_at,pickup_label,dropoff_label,pickup_radius_m,dropoff_radius_m,notes,pickup_lat,pickup_lng,dropoff_lat,dropoff_lng'
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (params?.status) query = query.eq('status', params.status)

  const q = (params?.q ?? '').trim()
  if (q) {
    query = query.or(`pickup_label.ilike.%${q}%,dropoff_label.ilike.%${q}%,notes.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as FreightUiRow[]
}

export async function getFreightById(id: string) {
  const { data, error } = await supabase
    .from('freight_ui')
    .select(
      'id,shipper_id,shipper_user_id,status,created_at,pickup_label,dropoff_label,pickup_radius_m,dropoff_radius_m,notes,pickup_lat,pickup_lng,dropoff_lat,dropoff_lng'
    )
    .eq('id', id)
    .single()

  if (error) throw error
  return data as FreightUiRow
}

export async function updateFreight(id: string, input: FreightUpdateInput) {
  const pickup_radius_m = Math.max(0, Math.round(input.pickup.radiusM ?? 0))
  const dropoff_radius_m = Math.max(0, Math.round(input.dropoff.radiusM ?? 0))

  // PostgREST costuma aceitar geometry via EWKT
  const pickup_geom = `SRID=4326;POINT(${input.pickup.lng} ${input.pickup.lat})`
  const dropoff_geom = `SRID=4326;POINT(${input.dropoff.lng} ${input.dropoff.lat})`

  const { data, error } = await supabase
    .from('freight')
    .update({
      pickup_label: input.pickup.label,
      pickup_geom,
      dropoff_label: input.dropoff.label,
      dropoff_geom,
      pickup_radius_m,
      dropoff_radius_m,
      notes: input.notes ?? null,
    })
    .eq('id', id)
    .select('id,shipper_id,status,created_at,pickup_label,dropoff_label,pickup_radius_m,dropoff_radius_m,notes')
    .single()

  if (error) throw error
  return data as FreightRow
}

export async function setFreightStatus(id: string, status: FreightStatus) {
  const { data, error } = await supabase
    .from('freight')
    .update({ status })
    .eq('id', id)
    .select('id,shipper_id,status,created_at,pickup_label,dropoff_label,pickup_radius_m,dropoff_radius_m,notes')
    .single()

  if (error) throw error
  return data as FreightRow
}
