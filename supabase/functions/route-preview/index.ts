import { createClient } from 'npm:@supabase/supabase-js@2'

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() })

  try {
    const ORS_API_KEY = Deno.env.get('ORS_API_KEY') ?? ''
    if (!ORS_API_KEY) throw new Error('Missing ORS_API_KEY')

    const body = await req.json()
    const profile = body.profile ?? 'driving-car'
    const coordinates = body.coordinates as Array<[number, number]>

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return new Response(JSON.stringify({ error: 'INVALID_COORDINATES' }), {
        status: 400,
        headers: { ...corsHeaders(), 'content-type': 'application/json' },
      })
    }

    const orsUrl = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`
    const orsResp = await fetch(orsUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: ORS_API_KEY },
      body: JSON.stringify({
        coordinates,
        instructions: false,
        // aumenta a chance de a rota "grudar" numa estrada próxima do ponto
        radiuses: coordinates.map(() => 8000), // 8km (ajuste se quiser 3000/5000)
      }),
    })

    if (!orsResp.ok) {
      const txt = await orsResp.text()
      return new Response(JSON.stringify({ error: 'ORS_ERROR', detail: txt }), {
        status: 400,
        headers: { ...corsHeaders(), 'content-type': 'application/json' },
      })
    }

    const geo = await orsResp.json()
    const summary = geo?.features?.[0]?.properties?.summary

    return new Response(
      JSON.stringify({
        route_geojson: geo,
        distance_m: summary?.distance ? Math.round(summary.distance) : null,
        duration_s: summary?.duration ? Math.round(summary.duration) : null,
      }),
      { headers: { ...corsHeaders(), 'content-type': 'application/json' } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: 'UNHANDLED', detail: String(e) }), {
      status: 500,
      headers: { ...corsHeaders(), 'content-type': 'application/json' },
    })
  }
})
