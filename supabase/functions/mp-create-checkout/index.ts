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

function toBrl(cents: number) {
  return Number((cents / 100).toFixed(2));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function refreshIfNeeded(admin: ReturnType<typeof createClient>, driverId: string) {
  const { data: sec, error } = await admin
    .from("mp_account_secrets")
    .select("access_token,refresh_token,expires_at")
    .eq("driver_id", driverId)
    .maybeSingle();

  if (error || !sec) throw new Error("Motorista não conectado ao Mercado Pago.");

  const expiresAt = new Date(sec.expires_at).getTime();
  if (Date.now() < expiresAt - 60_000) {
    return { accessToken: sec.access_token as string };
  }

  const clientId = Deno.env.get("MP_CLIENT_ID")!;
  const clientSecret = Deno.env.get("MP_CLIENT_SECRET")!;

  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("refresh_token", String(sec.refresh_token));

  const resp = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Falha ao renovar token: ${txt}`);
  }

  const tok = await resp.json();
  const accessToken = String(tok.access_token);
  const refreshToken = String(tok.refresh_token ?? sec.refresh_token);
  const expiresIn = Number(tok.expires_in ?? 0);
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  await admin.from("mp_account_secrets").upsert({
    driver_id: driverId,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: newExpiresAt,
  });

  return { accessToken };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Não autenticado." }, 401);

    const shipperId = userData.user.id;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const freightId = body.freightId ?? body.freight_id ?? null;
    const matchRequestId = body.matchRequestId ?? body.match_request_id ?? null;

    // Fallbacks opcionais (caso seu schema não tenha driver_id no match_request)
    const driverIdFromBody = body.driverId ?? body.driver_id ?? null;
    const totalCentsFromBody = body.totalCents ?? body.total_cents ?? null;
    const titleFromBody = body.title ?? "Frete de Retorno - Pagamento";

    if (!matchRequestId) return json({ error: "matchRequestId é obrigatório" }, 400);

    // 1) Buscar match_request
    const { data: matchRow, error: matchErr } = await admin
      .from("match_request")
      .select("*")
      .eq("id", matchRequestId)
      .maybeSingle();

    // Se sua tabela for match_requests (plural), ajuste aqui
    if (matchErr || !matchRow) {
      return json({
        error:
          "Não achei match_request. Se sua tabela for match_requests, troque o nome na function mp-create-checkout.",
      }, 400);
    }

    // 2) Descobrir driver_id
    const driverId =
      matchRow.driver_id ??
      matchRow.driverId ??
      matchRow.driver_user_id ??
      driverIdFromBody;

    if (!driverId) {
      return json({
        error:
          "Não consegui descobrir driverId. Envie driverId no body OU confirme se match_request tem driver_id.",
      }, 400);
    }

    // 3) Descobrir freight_id (se não veio no body)
    const freightIdResolved =
      freightId ??
      matchRow.freight_id ??
      matchRow.freightId ??
      null;

    // 4) Buscar freight (se tiver id)
    let totalCents: number | null = null;
    if (freightIdResolved) {
      const { data: freightRow } = await admin
        .from("freight")
        .select("*")
        .eq("id", freightIdResolved)
        .maybeSingle();

      // se sua tabela for freights (plural), ajuste aqui
      totalCents =
        Number(
          freightRow?.price_total_cents ??
            freightRow?.total_cents ??
            freightRow?.price_cents ??
            freightRow?.amount_total_cents ??
            NaN,
        );

      if (!Number.isFinite(totalCents)) totalCents = null;
    }

    if (!totalCents) {
      totalCents = Number(totalCentsFromBody);
      if (!Number.isFinite(totalCents)) {
        return json({
          error:
            "Não consegui descobrir o valor do frete (totalCents). Envie totalCents no body OU garanta um campo em freight (ex: price_total_cents).",
        }, 400);
      }
    }

    // 5) Taxa da plataforma (BPS = basis points)
    const bps = Number(Deno.env.get("PLATFORM_FEE_BPS") ?? "500"); // 5%
    const minCents = Number(Deno.env.get("PLATFORM_FEE_MIN_CENTS") ?? "0");
    const maxCents = Number(Deno.env.get("PLATFORM_FEE_MAX_CENTS") ?? String(totalCents));

    const fee = clamp(Math.round((totalCents * bps) / 10000), minCents, maxCents);
    const driverAmount = totalCents - fee;

    if (driverAmount <= 0) return json({ error: "Taxa maior/igual ao total." }, 400);

    // 6) Cria payment no banco
    const { data: created, error: payErr } = await admin
      .from("payments")
      .insert({
        freight_id: freightIdResolved,
        match_request_id: matchRequestId,
        shipper_id: shipperId,
        driver_id: driverId,
        amount_total_cents: totalCents,
        driver_amount_cents: driverAmount,
        platform_fee_cents: fee,
        status: "INITIATED",
      })
      .select("id")
      .maybeSingle();

    if (payErr || !created) throw new Error(payErr?.message ?? "Falha ao criar payment");

    const paymentId = created.id as string;

    // 7) Pegar/renovar token do motorista
    const { accessToken } = await refreshIfNeeded(admin, driverId);

    // 8) Criar preference (Checkout Pro) com marketplace_fee (split)
    const site = Deno.env.get("SITE_URL") ?? "http://localhost:5173";
    const webhookUrl = Deno.env.get("MP_WEBHOOK_URL")!;

    const preferenceBody = {
      items: [
        {
          title: titleFromBody,
          quantity: 1,
          unit_price: toBrl(totalCents),
          currency_id: "BRL",
        },
      ],
      marketplace_fee: toBrl(fee),
      external_reference: paymentId,
      notification_url: webhookUrl,
      back_urls: {
        success: `${site}/pagamentos/retorno?status=success&payment_id=${paymentId}`,
        pending: `${site}/pagamentos/retorno?status=pending&payment_id=${paymentId}`,
        failure: `${site}/pagamentos/retorno?status=failure&payment_id=${paymentId}`,
      },
      auto_return: "approved",
      metadata: {
        payment_id: paymentId,
        match_request_id: matchRequestId,
        freight_id: freightIdResolved,
      },
    };

    const prefResp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceBody),
    });

    const prefText = await prefResp.text();
    if (!prefResp.ok) {
      // loga evento e marca como cancelled
      await admin.from("payment_events").insert({
        payment_id: paymentId,
        event_type: "MP_PREFERENCE_ERROR",
        payload: { status: prefResp.status, body: prefText },
      });
      await admin.from("payments").update({ status: "CANCELLED" }).eq("id", paymentId);
      return json({ error: `Erro ao criar preference: ${prefText}` }, 400);
    }

    const pref = JSON.parse(prefText);

    await admin.from("payments").update({
      status: "PENDING",
      mp_preference_id: pref.id ?? null,
      mp_payload: pref,
    }).eq("id", paymentId);

    await admin.from("payment_events").insert({
      payment_id: paymentId,
      event_type: "MP_PREFERENCE_CREATED",
      payload: pref,
    });

    return json({
      paymentId,
      init_point: pref.init_point ?? null,
      sandbox_init_point: pref.sandbox_init_point ?? null,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
