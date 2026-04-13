import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createPostHogClient } from "../_shared/posthog.ts";

const ALLOWED_FIELDS  = ["vendor_name", "customer_name", "status", "date", "subtotal", "tax", "total", "notes", "currency", "logo_url", "logo_corner"];
const VALID_STATUSES  = new Set(["draft", "sent", "paid", "voided"]);
const VALID_CORNERS   = new Set(["top-left", "top-right", "bottom-left", "bottom-right"]);
const VALID_CURRENCIES = new Set(["CAD", "USD", "EUR", "GBP", "AUD", "NZD", "CHF", "JPY", "MXN", "SGD", "HKD", "INR"]);
const MAX_BODY_BYTES  = 64 * 1024; // 64 KB
const MAX_LINE_ITEMS  = 100;

// Trims and caps a string field. Returns null if the value is not a string.
function str(val: unknown, maxLen: number): string | null {
  if (typeof val !== "string") return null;
  return val.trim().slice(0, maxLen) || null;
}

// Clamps a numeric field to a safe range (no negative totals, no absurd values).
function num(val: unknown): number {
  const n = parseFloat(String(val ?? 0));
  return isNaN(n) ? 0 : Math.min(Math.max(n, 0), 999_999_999);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413, headers: corsHeaders });
  }

  // Auth client — anon key + user JWT so auth.getUser() works correctly
  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  // DB client — service role key bypasses RLS; ownership enforced by explicit .eq("user_id", user.id) on every query
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const queryId = url.searchParams.get("id");

  // GET — list all or fetch one by id
  if (req.method === "GET") {
    if (queryId) {
      const { data: receipt, error } = await supabase
        .from("receipts").select("*").eq("id", queryId).eq("user_id", user.id).single();
      if (error || !receipt) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });

      const { data: items } = await supabase.from("line_items").select("*").eq("receipt_id", queryId);
      return new Response(JSON.stringify({ ...receipt, line_items: items ?? [] }), { headers: corsHeaders });
    }

    // ?trash=1 returns soft-deleted invoices; default returns active ones
    const trashView = url.searchParams.get("trash") === "1";
    let listQuery = supabase.from("receipts").select("*").eq("user_id", user.id);
    if (trashView) {
      listQuery = listQuery.not("deleted_at", "is", null).order("deleted_at", { ascending: false });
    } else {
      listQuery = listQuery.is("deleted_at", null).order("created_at", { ascending: false });
    }
    const { data, error } = await listQuery;
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    return new Response(JSON.stringify(data), { headers: corsHeaders });
  }

  // POST — create receipt + line items
  if (req.method === "POST") {
    const body = await req.json();
    const vendor_name   = str(body.vendor_name,   200);
    const customer_name = str(body.customer_name, 200);
    const notes         = str(body.notes,         2000);
    const status        = VALID_STATUSES.has(body.status)    ? body.status    : "draft";
    const currency      = VALID_CURRENCIES.has(body.currency) ? body.currency : "CAD";
    const logo_corner   = VALID_CORNERS.has(body.logo_corner) ? body.logo_corner : null;
    const logo_url      = str(body.logo_url, 500);
    const date          = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().split("T")[0];

    if (!vendor_name || !customer_name) {
      return new Response(JSON.stringify({ error: "Vendor name and customer name are required" }), { status: 400, headers: corsHeaders });
    }

    const raw_items = Array.isArray(body.line_items) ? body.line_items.slice(0, MAX_LINE_ITEMS) : [];

    // Global sequential receipt number — counts ALL receipts across all users
    // so new users start at a high number, never revealing they're just starting out.
    const { count: globalCount } = await supabase
      .from("receipts")
      .select("*", { count: "exact", head: true });
    const nextNum = (globalCount ?? 0) + 1001; // floor at 1001 so no invoice ever reads INV-000001
    const receipt_number = `INV-${String(nextNum).padStart(6, "0")}`;

    const { data: receipt, error } = await supabase.from("receipts").insert({
      vendor_name, customer_name,
      receipt_number,
      status,
      date,
      subtotal: num(body.subtotal),
      tax:      num(body.tax),
      total:    num(body.total),
      notes,
      currency,
      logo_url,
      logo_corner,
      user_id: user.id,
    }).select().single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

    if (raw_items.length) {
      const items = raw_items.map((li: { description: string; quantity: number; unit_price: number; total: number }) => ({
        receipt_id:  receipt.id,
        description: str(li.description, 500) ?? "",
        quantity:    num(li.quantity),
        unit_price:  num(li.unit_price),
        total:       num(li.total),
      }));
      await supabase.from("line_items").insert(items);
    }

    const phCreate = createPostHogClient();
    phCreate.capture({
      distinctId: user.id,
      event: "invoice created",
      properties: {
        invoice_id: receipt.id,
        receipt_number: receipt.receipt_number,
        status: receipt.status,
        currency: receipt.currency,
        total: receipt.total,
        line_item_count: raw_items.length,
      },
    });
    await phCreate.shutdown();

    return new Response(JSON.stringify(receipt), { status: 201, headers: corsHeaders });
  }

  // PATCH ?restore=1 — move invoice out of trash
  if (req.method === "PATCH" && queryId && url.searchParams.get("restore") === "1") {
    const { error } = await supabase.from("receipts")
      .update({ deleted_at: null })
      .eq("id", queryId).eq("user_id", user.id);
    if (error) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });
    return new Response(JSON.stringify({ message: "Restored" }), { headers: corsHeaders });
  }

  // PATCH — update fields (whitelist enforced) + replace line items
  if (req.method === "PATCH" && queryId) {
    const body = await req.json();
    const id = queryId;

    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (!(key in body)) continue;
      // Sanitize each field type appropriately
      if (key === "vendor_name" || key === "customer_name") updates[key] = str(body[key], 200);
      else if (key === "notes")       updates[key] = str(body[key], 2000);
      else if (key === "logo_url")    updates[key] = str(body[key], 500);
      else if (key === "status")      updates[key] = VALID_STATUSES.has(body[key])    ? body[key] : undefined;
      else if (key === "currency")    updates[key] = VALID_CURRENCIES.has(body[key])  ? body[key] : undefined;
      else if (key === "logo_corner") updates[key] = VALID_CORNERS.has(body[key])     ? body[key] : null;
      else if (key === "date")        updates[key] = /^\d{4}-\d{2}-\d{2}$/.test(body[key] ?? "") ? body[key] : undefined;
      else if (["subtotal","tax","total"].includes(key)) updates[key] = num(body[key]);
      else updates[key] = body[key];
      // Drop undefined values (invalid enum entries above)
      if (updates[key] === undefined) delete updates[key];
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
      const raw_patch_items = body.line_items.slice(0, MAX_LINE_ITEMS);
      if (raw_patch_items.length > 0) {
        const items = (raw_patch_items as Array<{ description: string; quantity: number; unit_price: number; total: number }>)
          .map((li) => ({
            receipt_id:  id,
            description: str(li.description, 500) ?? "",
            quantity:    num(li.quantity),
            unit_price:  num(li.unit_price),
            total:       num(li.total),
          }));
        await supabase.from("line_items").insert(items);
      }
    }

    const phUpdate = createPostHogClient();
    phUpdate.capture({
      distinctId: user.id,
      event: "invoice updated",
      properties: {
        invoice_id: id,
        updated_fields: Object.keys(updates),
        line_items_replaced: Array.isArray(body.line_items),
      },
    });
    await phUpdate.shutdown();

    return new Response(JSON.stringify(data), { headers: corsHeaders });
  }

  // DELETE — soft delete by default; ?purge=1 for permanent hard delete
  if (req.method === "DELETE" && queryId) {
    const id = queryId;
    const purge = url.searchParams.get("purge") === "1";

    if (purge) {
      const { error } = await supabase.from("receipts").delete().eq("id", id).eq("user_id", user.id);
      if (error) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });
    } else {
      const { error } = await supabase.from("receipts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id).eq("user_id", user.id);
      if (error) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });
    }

    const phDelete = createPostHogClient();
    phDelete.capture({
      distinctId: user.id,
      event: purge ? "invoice purged" : "invoice deleted",
      properties: { invoice_id: id },
    });
    await phDelete.shutdown();

    return new Response(JSON.stringify({ message: purge ? "Purged" : "Deleted" }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
});
