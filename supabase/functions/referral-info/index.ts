import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  // Read own profile via RLS.
  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code, pro_grant_until")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });
  }

  // Count successful referrals via service role (cannot read other profiles via RLS).
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { count } = await adminClient
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("referred_by_code", profile.referral_code)
    .eq("referral_claimed", true);

  const code = profile.referral_code;
  const shareUrl = `https://invoiceprepper.com/?ref=${code}`;
  const grantActive = profile.pro_grant_until ? new Date(profile.pro_grant_until) > new Date() : false;

  return new Response(JSON.stringify({
    code,
    share_url: shareUrl,
    friends_referred: count ?? 0,
    pro_grant_until: profile.pro_grant_until,
    grant_active: grantActive,
  }), { headers: corsHeaders });
});
