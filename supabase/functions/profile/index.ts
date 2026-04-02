import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_BODY_BYTES = 32 * 1024; // 32 KB

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

  if (req.method === "GET") {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (data) return new Response(JSON.stringify(data), { headers: corsHeaders });

    // No profile yet — create a blank one on first login
    const { data: created } = await supabase.from("profiles").insert({
      user_id: user.id,
      tier: "free",
    }).select().single();
    return new Response(JSON.stringify(created ?? {}), { headers: corsHeaders });
  }

  if (req.method === "PUT") {
    const { business_name, address, email, phone, bio, website, payment_url, logo_url, avatar_url } = await req.json();
    const { data, error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      business_name: business_name ?? null,
      address: address ?? null,
      email: email ?? null,
      phone: phone ?? null,
      bio: bio ?? null,
      website: website ?? null,
      payment_url: payment_url ?? null,
      logo_url: logo_url ?? null,
      avatar_url: avatar_url ?? null,
    }, { onConflict: "user_id" }).select().single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    return new Response(JSON.stringify(data), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
});
