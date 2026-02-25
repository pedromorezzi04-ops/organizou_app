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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    console.log("Cakto webhook received:", JSON.stringify(body));

    const externalId =
      body.external_id ||
      body.externalId ||
      body.metadata?.external_id ||
      body.metadata?.externalId ||
      body.customer?.external_id ||
      body.data?.external_id ||
      body.data?.metadata?.external_id;

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

    // Log IMMEDIATELY - before any processing
    try {
      await serviceClient.from("webhook_logs").insert({
        payload: body,
        status: isPaid ? "paid" : "received",
        event_type: statusLower || "unknown",
        user_id: externalId || null,
      });
    } catch (logErr) {
      console.error("Failed to write initial log:", logErr);
    }

    if (!externalId) {
      console.error("No external_id found in payload:", JSON.stringify(body));
      return new Response(
        JSON.stringify({ error: "Missing external_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isPaid) {
      console.log(`Status "${status}" is not a paid status, ignoring.`);
      return new Response(
        JSON.stringify({ received: true, action: "ignored", status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Activate subscription
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
      // Log error
      await serviceClient.from("webhook_logs").insert({
        payload: body,
        status: "error",
        event_type: statusLower || "unknown",
        user_id: externalId,
      });
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
    // Log parse/unexpected errors
    try {
      await serviceClient.from("webhook_logs").insert({
        payload: { raw_error: String(err) },
        status: "error",
        event_type: "parse_error",
      });
    } catch (_) { /* ignore logging failure */ }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
