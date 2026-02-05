import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function parseSignature(sig: string) {
  // formato comum: "ts=1700000000,v1=abcdef..."
  const parts = sig.split(",").map((p) => p.trim());
  const map = new Map<string, string>();
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k && v) map.set(k, v);
  }
  return { ts: map.get("ts") ?? null, v1: map.get("v1") ?? null };
}

async function hmacSha256Hex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toInternalStatus(mpStatus?: string) {
  switch (mpStatus) {
    case "approved":
      return "APPROVED";
    case "pending":
    case "in_process":
      return "PENDING";
    case "rejected":
      return "REJECTED";
    case "cancelled":
      return "CANCELLED";
    case "refunded":
      return "REFUNDED";
    case "charged_back":
      return "CHARGEBACK";
    default:
      return "PENDING";
  }
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);

    // Mercado Pago normalmente manda id via query: data.id
    const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
    const topic = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "payment";

    // 1) Validar assinatura (recomendado)
    const secret = Deno.env.get("MP_WEBHOOK_SECRET") ?? "";
    const xSig = req.headers.get("x-signature") ?? "";
    const xReqId = req.headers.get("x-request-id") ?? "";

    if (secret && xSig && xReqId && dataId) {
      const { ts, v1 } = parseSignature(xSig);
      if (!ts || !v1) return new Response("Invalid signature header", { status: 401 });

      // template conhecido (Mercado Pago):
      // "id:{dataId};request-id:{xReqId};ts:{ts};"
      const manifest = `id:${dataId};request-id:${xReqId};ts:${ts};`;
      const computed = await hmacSha256Hex(secret, manifest);

      if (computed !== v1) return new Response("Signature mismatch", { status: 401 });
    } else {
      // Se não tiver secret configurado ainda, não bloqueia, mas loga.
      await admin.from("payment_events").insert({
        payment_id: null,
        event_type: "WEBHOOK_NO_SIGNATURE_VALIDATION",
        payload: { hasSecret: Boolean(secret), hasXSig: Boolean(xSig), hasXReqId: Boolean(xReqId), dataId },
      }).catch(() => {});
    }

    if (!dataId) return new Response("No data.id", { status: 200 });

    // 2) Buscar detalhes do pagamento no Mercado Pago
    // Estratégia robusta:
    // - usar PLATFORM_ACCESS_TOKEN para buscar por ID e pegar external_reference
    const platformToken = Deno.env.get("MP_PLATFORM_ACCESS_TOKEN")!;
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${platformToken}` },
    });

    const mpText = await mpResp.text();
    if (!mpResp.ok) {
      await admin.from("payment_events").insert({
        payment_id: null,
        event_type: "MP_WEBHOOK_FETCH_PAYMENT_ERROR",
        payload: { dataId, status: mpResp.status, body: mpText },
      }).catch(() => {});
      return new Response("ok", { status: 200 });
    }

    const mp = JSON.parse(mpText);
    const externalRef = mp.external_reference as string | null;
    const mpStatus = mp.status as string | undefined;
    const mpStatusDetail = mp.status_detail as string | undefined;

    if (!externalRef) {
      await admin.from("payment_events").insert({
        payment_id: null,
        event_type: "MP_WEBHOOK_NO_EXTERNAL_REFERENCE",
        payload: mp,
      }).catch(() => {});
      return new Response("ok", { status: 200 });
    }

    // 3) Atualiza nosso payment
    const internalStatus = toInternalStatus(mpStatus);

    await admin.from("payments").update({
      status: internalStatus,
      mp_payment_id: Number(mp.id),
      mp_status: mpStatus ?? null,
      mp_status_detail: mpStatusDetail ?? null,
      mp_payload: mp,
    }).eq("id", externalRef);

    await admin.from("payment_events").insert({
      payment_id: externalRef,
      event_type: "MP_WEBHOOK_RECEIVED",
      payload: { topic, dataId, mp_status: mpStatus, mp_status_detail: mpStatusDetail, mp },
    });

    return new Response("ok", { status: 200 });
  } catch {
    // webhook nunca deve “quebrar” (pra MP não ficar re-tentando em loop)
    return new Response("ok", { status: 200 });
  }
});
