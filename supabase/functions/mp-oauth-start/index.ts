import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";

    // client autenticado (pega user)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Não autenticado." }, 401);

    const userId = userData.user.id;
    const admin = createClient(supabaseUrl, serviceKey);

    // cria um state pra vincular o callback ao usuário certo
    const state = crypto.randomUUID();
    const { error: insErr } = await admin.from("mp_oauth_states").insert({
      state,
      user_id: userId,
      code_verifier: null,
    });
    if (insErr) throw insErr;

    const clientId = Deno.env.get("MP_CLIENT_ID")!;
    const redirectUri = Deno.env.get("MP_REDIRECT_URI")!;

    // URL padrão de autorização OAuth
    // (client_id, response_type=code, redirect_uri, state)
    const url = new URL("https://auth.mercadopago.com.br/authorization");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("platform_id", "mp");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);

    return json({ url: url.toString() });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
