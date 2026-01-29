import { createClient } from 'npm:@supabase/supabase-js@2';
function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS'
  };
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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase env vars');
    const body = await req.json();
    const limit = body.limit ?? 50;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabaseAdmin.rpc('match_freights_for_trip', {
      p_trip_id: body.tripId,
      p_limit: limit
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
      matches: data ?? []
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
