import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Método não permitido." } }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1. Extrair e validar JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ success: false, error: { code: "AUTH_REQUIRED", message: "Token de autenticação ausente." } }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) {
    return jsonResponse({ success: false, error: { code: "AUTH_REQUIRED", message: "Token inválido ou expirado." } }, 401);
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  // 2. Buscar status e assinatura do profile
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("status, subscription_status, subscription_expires_at")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("activate-coupon: profile fetch error", profileError);
    return jsonResponse({ success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao buscar perfil." } }, 500);
  }

  // 3. Verificar bloqueio
  if (profile.status === "blocked") {
    return jsonResponse({
      success: false,
      error: { code: "BLOCKED", message: "Sua conta está bloqueada. Entre em contato com o suporte." },
    }, 403);
  }

  // 4. Verificar assinatura ativa
  if (profile.subscription_status === "active" && profile.subscription_expires_at) {
    if (new Date(profile.subscription_expires_at) > new Date()) {
      return jsonResponse({
        success: false,
        error: { code: "ALREADY_ACTIVE", message: "Você já possui uma assinatura ativa." },
      }, 409);
    }
  }

  // 5. Extrair código do body
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: { code: "VALIDATION_ERROR", message: "Body inválido." } }, 400);
  }

  const code = (body.code ?? "").trim().toUpperCase();
  if (!code) {
    return jsonResponse({ success: false, error: { code: "VALIDATION_ERROR", message: "Informe o código do cupom." } }, 400);
  }

  // 6. Validar cupom via função SQL existente (service role bypassa RLS)
  const { data: isValid, error: couponError } = await serviceClient.rpc("validate_coupon", { _code: code });
  if (couponError) {
    console.error("activate-coupon: validate_coupon error", couponError);
    return jsonResponse({ success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao validar cupom." } }, 500);
  }
  if (!isValid) {
    return jsonResponse({ success: false, error: { code: "INVALID_COUPON", message: "Cupom inválido ou expirado." } }, 400);
  }

  // 7. Ativar assinatura (mesmo comportamento do cakto-webhook)
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  const { error: updateError } = await serviceClient
    .from("profiles")
    .update({
      subscription_status: "active",
      subscription_expires_at: expiresAt.toISOString(),
      // NÃO altera profiles.status — preserva bans
    })
    .eq("user_id", user.id);

  if (updateError) {
    console.error("activate-coupon: update error", updateError);
    return jsonResponse({ success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao ativar assinatura." } }, 500);
  }

  // 8. Registrar em webhook_logs para auditoria
  await serviceClient.from("webhook_logs").insert({
    payload: { coupon_code: code },
    status: "success",
    event_type: "coupon_activation",
    user_id: user.id,
  }).then(() => {}).catch(() => {});

  console.log(JSON.stringify({
    action: "coupon_activation",
    user_id: user.id,
    expires_at: expiresAt.toISOString(),
    timestamp: new Date().toISOString(),
  }));

  return jsonResponse({
    success: true,
    data: {
      message: "Cupom ativado com sucesso!",
      expires_at: expiresAt.toISOString(),
    },
  });
});
