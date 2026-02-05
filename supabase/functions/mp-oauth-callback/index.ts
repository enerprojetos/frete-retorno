import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function form(data: Record<string, string>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) body.set(k, v);
  return body.toString();
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) return new Response("Missing code/state", { status: 400 });

    const { data: stRow, error: stErr } = await admin
      .from("mp_oauth_states")
      .select("state,user_id,created_at")
      .eq("state", state)
      .maybeSingle();

    if (stErr || !stRow) return new Response("Invalid state", { status: 400 });

    // expira state em 15 min
    const createdAt = new Date(stRow.created_at);
    if (Date.now() - createdAt.getTime() > 15 * 60 * 1000) {
      await admin.from("mp_oauth_states").delete().eq("state", state);
      return new Response("State expired", { status: 400 });
    }

    const clientId = Deno.env.get("MP_CLIENT_ID")!;
    const clientSecret = Deno.env.get("MP_CLIENT_SECRET")!;
    const redirectUri = Deno.env.get("MP_REDIRECT_URI")!;

    // Troca authorization_code -> tokens (OAuth)
    const resp = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(`OAuth token error: ${txt}`, { status: 400 });
    }

    const tok = await resp.json();

    const accessToken = String(tok.access_token);
    const refreshToken = String(tok.refresh_token);
    const expiresIn = Number(tok.expires_in ?? 0);
    const mpUserId = Number(tok.user_id);

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // upsert conta
    const { error: accErr } = await admin.from("mp_accounts").upsert({
      driver_id: stRow.user_id,
      mp_user_id: mpUserId,
    });
    if (accErr) return new Response(`DB mp_accounts error: ${accErr.message}`, { status: 500 });

    // upsert segredos
    const { error: secErr } = await admin.from("mp_account_secrets").upsert({
      driver_id: stRow.user_id,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      scope: tok.scope ?? null,
      token_type: tok.token_type ?? null,
    });
    if (secErr) return new Response(`DB mp_account_secrets error: ${secErr.message}`, { status: 500 });

    // limpa state
    await admin.from("mp_oauth_states").delete().eq("state", state);

    const site = Deno.env.get("SITE_URL") ?? "http://localhost:5173";
    // você cria essa página no front (vou te dar o código abaixo)
    return Response.redirect(`${site}/driver/pagamentos?mp=connected`, 302);
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
