import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    console.log("Cakto webhook received:", JSON.stringify(body));

    // Extract external_id (user ID) - check common Cakto payload structures
    const externalId =
      body.external_id ||
      body.externalId ||
      body.metadata?.external_id ||
      body.metadata?.externalId ||
      body.customer?.external_id ||
      body.data?.external_id ||
      body.data?.metadata?.external_id;

    if (!externalId) {
      console.error("No external_id found in payload:", JSON.stringify(body));
      return new Response(
        JSON.stringify({ error: "Missing external_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check payment status - accept common paid/approved statuses
    const status =
      body.status ||
      body.payment_status ||
      body.event ||
      body.data?.status ||
      body.type ||
      "";
    const statusLower = String(status).toLowerCase();

    const isPaid =
      statusLower.includes("paid") ||
      statusLower.includes("approved") ||
      statusLower.includes("completed") ||
      statusLower.includes("confirmed") ||
      statusLower.includes("active");

    if (!isPaid) {
      console.log(`Status "${status}" is not a paid status, ignoring.`);
      return new Response(
        JSON.stringify({ received: true, action: "ignored", status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Activate subscription
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { error: updateError } = await serviceClient
      .from("profiles")
      .update({
        subscription_status: "active",
        subscription_expires_at: expiresAt.toISOString(),
        status: "active",
      })
      .eq("user_id", externalId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Subscription activated for user ${externalId}, expires at ${expiresAt.toISOString()}`);

    return new Response(
      JSON.stringify({ success: true, userId: externalId, expiresAt: expiresAt.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
