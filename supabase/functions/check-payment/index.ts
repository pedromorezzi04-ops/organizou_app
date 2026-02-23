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

    // Parse billing ID from body
    const { billingId } = await req.json().catch(() => ({ billingId: null }));
    if (!billingId) {
      return new Response(JSON.stringify({ error: "Missing billingId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get API credentials
    const { data: apiKey } = await serviceClient.rpc("get_system_setting", {
      _key: "abacatepay_api_key",
    });
    const { data: baseUrl } = await serviceClient.rpc("get_system_setting", {
      _key: "abacatepay_endpoint",
    });

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: "Payment system not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query AbacatePay for billing status
    const statusUrl = `${baseUrl.replace(/\/+$/, "")}/billing/get?id=${encodeURIComponent(billingId)}`;
    const statusRes = await fetch(statusUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const statusData = await statusRes.json();

    if (!statusRes.ok) {
      console.error("AbacatePay status check error:", statusData);
      return new Response(
        JSON.stringify({ error: "Failed to check payment status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const billingStatus = statusData?.data?.status || statusData?.status || "PENDING";
    const isPaid = billingStatus === "PAID";

    // If paid, activate the subscription
    if (isPaid) {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await serviceClient
        .from("profiles")
        .update({
          subscription_status: "active",
          subscription_expires_at: expiresAt.toISOString(),
          status: "active",
        })
        .eq("user_id", userId);

      console.log(`Payment confirmed for user ${userId}, activated until ${expiresAt.toISOString()}`);
    }

    return new Response(
      JSON.stringify({ status: billingStatus, isPaid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Check payment error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
