import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const ALLOWED_FIELDS = ["vendor_name", "customer_name", "status", "date", "subtotal", "tax", "total", "notes", "currency", "logo_url", "logo_corner"];
const MAX_BODY_BYTES = 64 * 1024; // 64 KB

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const queryId = url.searchParams.get("id");

  // GET — list all or fetch one by id
  if (req.method === "GET") {
    if (queryId) {
      const { data: receipt, error } = await supabase
        .from("receipts").select("*").eq("id", queryId).single();
      if (error || !receipt) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });

      const { data: items } = await supabase.from("line_items").select("*").eq("receipt_id", queryId);
      return new Response(JSON.stringify({ ...receipt, line_items: items ?? [] }), { headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from("receipts").select("*").order("created_at", { ascending: false });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    return new Response(JSON.stringify(data), { headers: corsHeaders });
  }

  // POST — create receipt + line items
  if (req.method === "POST") {
    const { vendor_name, customer_name, status, date, subtotal, tax, total, notes, line_items, logo_url, logo_corner } = await req.json();
    if (!vendor_name || !customer_name) {
      return new Response(JSON.stringify({ error: "Vendor name and customer name are required" }), { status: 400, headers: corsHeaders });
    }

    const { data: receipt, error } = await supabase.from("receipts").insert({
      vendor_name, customer_name,
      status: status ?? "draft",
      date: date ?? new Date().toISOString().split("T")[0],
      subtotal: subtotal ?? 0,
      tax: tax ?? 0,
      total: total ?? 0,
      notes: notes ?? null,
      logo_url: logo_url ?? null,
      logo_corner: logo_corner ?? null,
      user_id: user.id,
    }).select().single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

    if (line_items?.length) {
      const items = line_items.map((li: { description: string; quantity: number; unit_price: number; total: number }) => ({
        receipt_id: receipt.id,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        total: li.total,
      }));
      await supabase.from("line_items").insert(items);
    }

    return new Response(JSON.stringify(receipt), { status: 201, headers: corsHeaders });
  }

  // PATCH — update fields (whitelist enforced) + replace line items
  if (req.method === "PATCH" && queryId) {
    const body = await req.json();
    const id = queryId;

    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updates[key] = body[key];
    }
    if (!Object.keys(updates).length) {
      return new Response(JSON.stringify({ error: "No valid fields to update" }), { status: 400, headers: corsHeaders });
    }

    // Explicit user_id filter ensures ownership regardless of RLS UPDATE policy setup
    const { data, error } = await supabase
      .from("receipts").update(updates)
      .eq("id", id).eq("user_id", user.id)
      .select().single();
    if (error || !data) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });

    // Replace line items if provided — delete old rows then insert fresh ones
    if (Array.isArray(body.line_items)) {
      await supabase.from("line_items").delete().eq("receipt_id", id);
      if (body.line_items.length > 0) {
        const items = (body.line_items as Array<{ description: string; quantity: number; unit_price: number; total: number }>)
          .map((li) => ({
            receipt_id: id,
            description: li.description,
            quantity: li.quantity,
            unit_price: li.unit_price,
            total: li.total,
          }));
        await supabase.from("line_items").insert(items);
      }
    }

    return new Response(JSON.stringify(data), { headers: corsHeaders });
  }

  // DELETE
  if (req.method === "DELETE" && queryId) {
    const id = queryId;

    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (error) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });
    return new Response(JSON.stringify({ message: "Deleted" }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
});
