import { supabase } from '@/shared/lib/supabaseClient'

const FUNCTIONS_URL = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined) ?? ''
const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

async function buildFunctionHeaders() {
  const h: Record<string, string> = { 'content-type': 'application/json' }
  if (ANON_KEY) h.apikey = ANON_KEY

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token ?? ANON_KEY
  if (token) h.Authorization = `Bearer ${token}`

  return h
}

export async function getRoutePreview(params: {
  profile?: 'driving-car' | 'driving-hgv'
  coordinates: Array<[number, number]> // [lng, lat]
}) {
  if (!FUNCTIONS_URL) throw new Error('Missing VITE_SUPABASE_FUNCTIONS_URL')

  const url = `${FUNCTIONS_URL}/route-preview`
  const resp = await fetch(url, {
    method: 'POST',
    headers: await buildFunctionHeaders(),
    body: JSON.stringify(params),
  })

  const json = await resp.json().catch(() => null)
  if (!resp.ok) throw new Error(json?.detail ?? json?.error ?? `Failed (HTTP ${resp.status})`)

  return json as { route_geojson: any; distance_m: number | null; duration_s: number | null }
}
