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

    // Verify user
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
    const userEmail = claimsData.claims.email as string;

    // Parse body
    const { couponCode } = await req.json().catch(() => ({ couponCode: null }));

    // Service client to read system_settings
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Validate coupon if provided
    let isCouponValid = false;
    if (couponCode) {
      const { data } = await serviceClient.rpc("validate_coupon", { _code: couponCode });
      isCouponValid = data === true;
    }

    // Get API key and base URL from system_settings
    const { data: apiKey } = await serviceClient.rpc("get_system_setting", {
      _key: "abacatepay_api_key",
    });
    const { data: baseUrl } = await serviceClient.rpc("get_system_setting", {
      _key: "abacatepay_endpoint",
    });

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: "Payment system not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const amount = isCouponValid ? 0 : 5000; // R$ 50,00 in cents

    // If coupon is valid and amount is 0, activate directly
    if (amount === 0) {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await serviceClient
        .from("profiles")
        .update({
          subscription_status: "active",
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ success: true, free: true, message: "Cupom aplicado com sucesso!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get("origin") || "https://easy-funds.lovable.app";

    // Create billing on AbacatePay using the correct payload format
    const billingEndpoint = `${baseUrl.replace(/\/+$/, "")}/billing/create`;
    const billingResponse = await fetch(billingEndpoint, {
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
            externalId: `sub-${userId}`,
            name: "Plano Mensal Organizou+",
            quantity: 1,
            price: amount,
          },
        ],
        metadata: { userId, email: userEmail },
        returnUrl: `${origin}/?status=checking`,
        completionUrl: `${origin}/?status=checking`,
        customer: {
          email: userEmail,
        },
      }),
    });

    const billingData = await billingResponse.json();

    if (!billingResponse.ok) {
      console.error("AbacatePay error:", billingData);
      return new Response(
        JSON.stringify({ error: "Failed to create checkout", details: billingData }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract billing ID for client-side tracking
    const billingId = billingData?.data?.id || billingData?.id || null;

    return new Response(JSON.stringify({ success: true, billing: billingData, billingId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
