import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransactionPayload {
  type: "income" | "expense";
  description: string;
  amount: number;
  category?: string;
  payment_method?: string;
  status?: "paid" | "pending";
  due_date?: string;
}

interface InstallmentPayload {
  customer_name: string;
  total_value: number;
  total_installments: number;
  first_due_date: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Bearer token required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;
    const url = new URL(req.url);
    const path = url.pathname.replace("/agent-api", "");

    console.log(`[Agent API] ${req.method} ${path} - User: ${userId}`);

    // Route: POST /transactions - Create a transaction (entrada or saída)
    if (req.method === "POST" && path === "/transactions") {
      const body: TransactionPayload = await req.json();

      // Validate required fields
      if (!body.type || !["income", "expense"].includes(body.type)) {
        return new Response(
          JSON.stringify({ error: "type is required and must be 'income' or 'expense'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!body.description || body.description.trim() === "") {
        return new Response(
          JSON.stringify({ error: "description is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (typeof body.amount !== "number" || body.amount <= 0) {
        return new Response(
          JSON.stringify({ error: "amount is required and must be a positive number" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          type: body.type,
          description: body.description.trim(),
          amount: body.amount,
          category: body.category || null,
          payment_method: body.payment_method || null,
          status: body.status || "paid",
          due_date: body.due_date || null,
        })
        .select()
        .single();

      if (error) {
        console.error("[Agent API] Transaction insert error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create transaction", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[Agent API] Transaction created: ${data.id}`);
      return new Response(
        JSON.stringify({ success: true, transaction: data }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route: POST /installments - Create installments (notinhas)
    if (req.method === "POST" && path === "/installments") {
      const body: InstallmentPayload = await req.json();

      // Validate required fields
      if (!body.customer_name || body.customer_name.trim() === "") {
        return new Response(
          JSON.stringify({ error: "customer_name is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (typeof body.total_value !== "number" || body.total_value <= 0) {
        return new Response(
          JSON.stringify({ error: "total_value is required and must be a positive number" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (typeof body.total_installments !== "number" || body.total_installments < 1) {
        return new Response(
          JSON.stringify({ error: "total_installments is required and must be at least 1" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!body.first_due_date) {
        return new Response(
          JSON.stringify({ error: "first_due_date is required (format: YYYY-MM-DD)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate installment value
      const installmentValue = body.total_value / body.total_installments;
      const firstDueDate = new Date(body.first_due_date);
      
      // Generate a parent_note_id to group installments
      const parentNoteId = crypto.randomUUID();

      // Create all installments
      const installmentsToCreate = [];
      for (let i = 0; i < body.total_installments; i++) {
        const dueDate = new Date(firstDueDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        installmentsToCreate.push({
          user_id: userId,
          customer_name: body.customer_name.trim(),
          total_value: installmentValue,
          current_installment: i + 1,
          total_installments: body.total_installments,
          parent_note_id: parentNoteId,
          due_date: dueDate.toISOString().split("T")[0],
          status: "pending",
        });
      }

      const { data, error } = await supabase
        .from("installments")
        .insert(installmentsToCreate)
        .select();

      if (error) {
        console.error("[Agent API] Installments insert error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create installments", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[Agent API] ${data.length} installments created for ${body.customer_name}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${data.length} parcelas criadas para ${body.customer_name}`,
          parent_note_id: parentNoteId,
          installments: data 
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route: GET /summary - Get financial summary
    if (req.method === "GET" && path === "/summary") {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

      // Get monthly transactions
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("type, amount")
        .eq("user_id", userId)
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth + "T23:59:59");

      if (txError) {
        console.error("[Agent API] Summary fetch error:", txError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch summary" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const income = transactions?.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const expenses = transactions?.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Get pending installments
      const { data: pendingInstallments, error: instError } = await supabase
        .from("installments")
        .select("total_value")
        .eq("user_id", userId)
        .eq("status", "pending")
        .lte("due_date", endOfMonth);

      const pendingAmount = pendingInstallments?.reduce((sum, i) => sum + Number(i.total_value), 0) || 0;

      return new Response(
        JSON.stringify({
          month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
          income,
          expenses,
          balance: income - expenses,
          pending_installments: pendingAmount,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 404 for unknown routes
    return new Response(
      JSON.stringify({ 
        error: "Not found",
        available_routes: [
          "POST /transactions - Create income/expense",
          "POST /installments - Create installments (notinhas)",
          "GET /summary - Get monthly financial summary"
        ]
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Agent API] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
