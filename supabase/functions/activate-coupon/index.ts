import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function serverError(message: string) {
  return new Response(
    JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message } }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return ok({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Método não permitido." } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1. Validar JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return ok({ success: false, error: { code: "AUTH_REQUIRED", message: "Token de autenticação ausente." } });
  }

  const token = authHeader.replace("Bearer ", "");
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) {
    return ok({ success: false, error: { code: "AUTH_REQUIRED", message: "Token inválido ou expirado." } });
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  // 2. Buscar profile
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("status, subscription_status, subscription_expires_at")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("activate-coupon: profile fetch error", profileError);
    return serverError("Erro ao buscar perfil.");
  }

  // 3. Verificar bloqueio
  if (profile.status === "blocked") {
    return ok({
      success: false,
      error: { code: "BLOCKED", message: "Sua conta está bloqueada. Entre em contato com o suporte." },
    });
  }

  // 4. Verificar assinatura já ativa
  if (profile.subscription_status === "active" && profile.subscription_expires_at) {
    if (new Date(profile.subscription_expires_at) > new Date()) {
      return ok({
        success: false,
        error: { code: "ALREADY_ACTIVE", message: "Você já possui uma assinatura ativa." },
      });
    }
  }

  // 5. Extrair código do cupom
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return ok({ success: false, error: { code: "VALIDATION_ERROR", message: "Body inválido." } });
  }

  const code = (body.code ?? "").trim().toUpperCase();
  if (!code) {
    return ok({ success: false, error: { code: "VALIDATION_ERROR", message: "Informe o código do cupom." } });
  }

  // 6. Validar cupom (service role bypassa RLS da tabela coupons)
  const { data: isValid, error: couponError } = await serviceClient.rpc("validate_coupon", { _code: code });
  if (couponError) {
    console.error("activate-coupon: validate_coupon error", couponError);
    return serverError("Erro ao validar cupom.");
  }
  if (!isValid) {
    return ok({ success: false, error: { code: "INVALID_COUPON", message: "Cupom inválido ou expirado." } });
  }

  // 7. Ativar assinatura (idêntico ao cakto-webhook — NÃO altera profiles.status)
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  const { error: updateError } = await serviceClient
    .from("profiles")
    .update({
      subscription_status: "active",
      subscription_expires_at: expiresAt.toISOString(),
    })
    .eq("user_id", user.id);

  if (updateError) {
    console.error("activate-coupon: update error", updateError);
    return serverError("Erro ao ativar assinatura.");
  }

  // 8. Log de auditoria (falha silenciosa)
  serviceClient.from("webhook_logs").insert({
    payload: { coupon_code: code },
    status: "success",
    event_type: "coupon_activation",
    user_id: user.id,
  }).catch(() => {});

  console.log(JSON.stringify({
    action: "coupon_activation",
    user_id: user.id,
    expires_at: expiresAt.toISOString(),
    timestamp: new Date().toISOString(),
  }));

  return ok({
    success: true,
    data: { message: "Cupom ativado com sucesso!", expires_at: expiresAt.toISOString() },
  });
});
