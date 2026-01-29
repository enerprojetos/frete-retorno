import { createClient } from 'npm:@supabase/supabase-js@2';
function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS'
  };
}
function toLineStringEWKT(coords) {
  // coords: [[lng,lat], [lng,lat], ...]
  const pairs = coords.map(([lng, lat])=>`${lng} ${lat}`).join(', ');
  return `SRID=4326;LINESTRING(${pairs})`;
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: corsHeaders()
  });
  if (req.method !== 'POST') return new Response('Method Not Allowed', {
    status: 405,
    headers: corsHeaders()
  });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const ORS_API_KEY = Deno.env.get('ORS_API_KEY') ?? '';
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase env vars');
    if (!ORS_API_KEY) throw new Error('Missing ORS_API_KEY');
    const body = await req.json();
    const profile = body.profile ?? 'driving-car';
    const corridorRadiusM = body.corridorRadiusM ?? 50_000;
    // ORS Directions endpoint:
    // /v2/directions/{profile}/geojson  (GeoJSON de rota)
    // Referência: docs do openrouteservice (v2/directions/{profile}/geojson) via openrouteservice-py
    const orsUrl = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;
    const orsPayload = {
      coordinates: [
        [
          body.origin.lng,
          body.origin.lat
        ],
        [
          body.destination.lng,
          body.destination.lat
        ]
      ],
      instructions: false
    };
    const orsResp = await fetch(orsUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: ORS_API_KEY
      },
      body: JSON.stringify(orsPayload)
    });
    if (!orsResp.ok) {
      const txt = await orsResp.text();
      return new Response(JSON.stringify({
        error: 'ORS_ERROR',
        detail: txt
      }), {
        status: 400,
        headers: {
          ...corsHeaders(),
          'content-type': 'application/json'
        }
      });
    }
    const geo = await orsResp.json();
    // Esperado: FeatureCollection; rota em features[0].geometry.coordinates
    const coords = geo?.features?.[0]?.geometry?.coordinates;
    const summary = geo?.features?.[0]?.properties?.summary;
    const distanceM = summary?.distance ? Math.round(summary.distance) : null;
    const durationS = summary?.duration ? Math.round(summary.duration) : null;
    if (!coords || coords.length < 2) {
      return new Response(JSON.stringify({
        error: 'INVALID_ROUTE_GEOMETRY'
      }), {
        status: 400,
        headers: {
          ...corsHeaders(),
          'content-type': 'application/json'
        }
      });
    }
    const routeEWKT = toLineStringEWKT(coords);
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabaseAdmin.rpc('create_trip', {
      p_driver_id: body.driverId,
      p_origin_label: body.origin.label,
      p_origin_lng: body.origin.lng,
      p_origin_lat: body.origin.lat,
      p_destination_label: body.destination.label,
      p_destination_lng: body.destination.lng,
      p_destination_lat: body.destination.lat,
      p_corridor_radius_m: corridorRadiusM,
      p_profile: profile,
      p_route_ewkt: routeEWKT,
      p_route_distance_m: distanceM,
      p_route_duration_s: durationS
    });
    if (error) {
      return new Response(JSON.stringify({
        error: 'DB_ERROR',
        detail: error
      }), {
        status: 500,
        headers: {
          ...corsHeaders(),
          'content-type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({
      trip: data
    }), {
      headers: {
        ...corsHeaders(),
        'content-type': 'application/json'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: 'UNHANDLED',
      detail: String(e)
    }), {
      status: 500,
      headers: {
        ...corsHeaders(),
        'content-type': 'application/json'
      }
    });
  }
});
