import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const { data: isAdmin } = await serviceClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { action, amount, billingId } = body;

    // Get API credentials
    const { data: apiKey } = await serviceClient.rpc("get_system_setting", {
      _key: "abacatepay_api_key",
    });
    const { data: baseUrl } = await serviceClient.rpc("get_system_setting", {
      _key: "abacatepay_endpoint",
    });

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: "API não configurada. Configure a API Key e Base URL na aba de configurações.", apiKey: !!apiKey, baseUrl: !!baseUrl }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanBaseUrl = baseUrl.replace(/\/+$/, "");

    if (action === "create_billing") {
      const priceInCents = Math.round((amount || 1) * 100);
      const origin = req.headers.get("origin") || "https://easy-funds.lovable.app";

      const billingResponse = await fetch(`${cleanBaseUrl}/billing/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          frequency: "ONE_TIME",
          methods: ["PIX"],
          products: [
            {
              externalId: `admin-test-${Date.now()}`,
              name: "Teste Admin Organizou+",
              quantity: 1,
              price: priceInCents,
            },
          ],
          returnUrl: `${origin}/admin-secret-dashboard`,
          completionUrl: `${origin}/admin-secret-dashboard`,
          customer: {
            name: (claimsData.claims.email as string).split("@")[0],
            email: claimsData.claims.email as string,
            cellphone: "11999999999",
            taxId: "00000000000",
          },
        }),
      });

      const billingData = await billingResponse.json();
      return new Response(
        JSON.stringify({
          success: billingResponse.ok,
          status: billingResponse.status,
          endpoint: `${cleanBaseUrl}/billing/create`,
          response: billingData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check_billing") {
      if (!billingId) {
        return new Response(
          JSON.stringify({ error: "billingId é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const statusRes = await fetch(
        `${cleanBaseUrl}/billing/get?id=${encodeURIComponent(billingId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const statusData = await statusRes.json();
      return new Response(
        JSON.stringify({
          success: statusRes.ok,
          status: statusRes.status,
          endpoint: `${cleanBaseUrl}/billing/get?id=${billingId}`,
          response: statusData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "action inválida. Use 'create_billing' ou 'check_billing'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Admin test error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
