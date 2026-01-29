import { supabase } from '@/shared/lib/supabaseClient'

export type MatchRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'

export type MatchRequestRow = {
  id: string
  freight_id: string
  trip_id: string
  status: MatchRequestStatus

  driver_display_name: string
  shipper_display_name: string

  freight_pickup_label: string
  freight_dropoff_label: string
  trip_origin_label: string
  trip_destination_label: string

  created_at: string
}

export async function listRequestsForTrip(tripId: string) {
  const { data, error } = await supabase
    .from('match_request')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as MatchRequestRow[]
}

export async function proposeMatchRequest(tripId: string, freightId: string) {
  const { data, error } = await supabase.rpc('propose_match_request', {
    p_trip_id: tripId,
    p_freight_id: freightId,
  })
  if (error) throw error
  return data as MatchRequestRow
}

export async function cancelMatchRequest(matchRequestId: string) {
  const { data, error } = await supabase.rpc('driver_cancel_match_request', {
    p_match_request_id: matchRequestId,
  })
  if (error) throw error
  return data as MatchRequestRow
}

export type MatchRequestDetail = {
  id: string
  status: MatchRequestStatus
  shipper_contact_name: string | null
  shipper_contact_phone: string | null
  driver_phone: string | null
}

export async function getMatchRequestDetail(matchRequestId: string) {
  const { data, error } = await supabase.rpc('get_match_request_detail', {
    p_match_request_id: matchRequestId,
  })
  if (error) throw error
  // função retorna TABLE => array
  return (data?.[0] ?? null) as MatchRequestDetail | null
}
