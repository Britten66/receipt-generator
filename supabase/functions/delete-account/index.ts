import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "DELETE") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  // Auth check — anon key + user JWT
  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  // Service role client — needed to delete auth user and bypass RLS
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Delete line_items for all this user's receipts
  const { data: receipts } = await admin.from("receipts").select("id").eq("user_id", user.id);
  if (receipts?.length) {
    const ids = receipts.map((r: { id: string }) => r.id);
    await admin.from("line_items").delete().in("receipt_id", ids);
  }

  // 2. Delete all receipts
  await admin.from("receipts").delete().eq("user_id", user.id);

  // 3. Delete profile
  await admin.from("profiles").delete().eq("user_id", user.id);

  // 4. Delete the auth user — this is irreversible
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
});
