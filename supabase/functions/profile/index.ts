import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_BODY_BYTES   = 32 * 1024; // 32 KB
const VALID_CURRENCIES = new Set(["CAD", "USD", "EUR", "GBP", "AUD", "NZD", "CHF", "JPY", "MXN", "SGD", "HKD", "INR"]);

function str(val: unknown, maxLen: number): string | null {
  if (typeof val !== "string") return null;
  return val.trim().slice(0, maxLen) || null;
}

// URL fields: must start with https:// or http:// to prevent javascript: injection
function safeUrl(val: unknown, maxLen = 500): string | null {
  const s = str(val, maxLen);
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : null;
}

// If the user has an active referral grant and is on free, surface them as pro to the
// frontend so feature gates work without a refactor. The real `tier` (Stripe-driven) is
// returned as `stripe_tier` so the billing UI can still distinguish granted vs paid Pro.
function applyGrantToTier(profile: Record<string, unknown>): Record<string, unknown> {
  if (!profile || Object.keys(profile).length === 0) return profile;
  const grantUntil = profile.pro_grant_until as string | null;
  const grantActive = !!grantUntil && new Date(grantUntil).getTime() > Date.now();
  const realTier = (profile.tier as string) ?? "free";
  return {
    ...profile,
    stripe_tier: realTier,
    tier: realTier === "free" && grantActive ? "pro" : realTier,
  };
}

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
    if (data) return new Response(JSON.stringify(applyGrantToTier(data)), { headers: corsHeaders });

    // No profile yet: create one on first login. Look for a referral code in
    // two places, in priority order:
    //   1. ?ref= query param (same-device signup flow, set by fetchProfile)
    //   2. user.user_metadata.ref_code (set at signUp, survives device switches)
    const url = new URL(req.url);
    const queryRef = url.searchParams.get("ref")?.trim().toUpperCase().slice(0, 8) || null;
    const metaRefRaw = (user.user_metadata as Record<string, unknown> | undefined)?.ref_code;
    const metaRef = typeof metaRefRaw === "string" ? metaRefRaw.trim().toUpperCase().slice(0, 8) : null;
    const refCode = queryRef || metaRef;
    const validRef = refCode && /^[A-Z0-9]+$/.test(refCode) ? refCode : null;

    const { data: created } = await supabase.from("profiles").insert({
      user_id: user.id,
      tier: "free",
      ...(validRef ? { referred_by_code: validRef } : {}),
    }).select().single();
    return new Response(JSON.stringify(applyGrantToTier(created ?? {})), { headers: corsHeaders });
  }

  if (req.method === "PUT") {
    const body = await req.json();

    // Only include fields the client actually sent. Skipping a field leaves the existing
    // DB value untouched. Without this, a partial PUT (e.g. just terms_agreed_at) would
    // wipe business_name, address, etc., to null.
    const tax_rate_val = parseFloat(String(body.tax_rate ?? ""));
    const payload: Record<string, unknown> = { user_id: user.id };
    if (body.business_name !== undefined) payload.business_name = str(body.business_name, 200);
    if (body.address       !== undefined) payload.address       = str(body.address,       400);
    if (body.email         !== undefined) payload.email         = str(body.email,         254);
    if (body.phone         !== undefined) payload.phone         = str(body.phone,         30);
    if (body.bio           !== undefined) payload.bio           = str(body.bio,           500);
    if (body.website       !== undefined) payload.website       = safeUrl(body.website);
    if (body.payment_url   !== undefined) payload.payment_url   = safeUrl(body.payment_url);
    if (body.logo_url      !== undefined) payload.logo_url      = str(body.logo_url,      500);
    if (body.avatar_url    !== undefined) payload.avatar_url    = str(body.avatar_url,    500);
    if (body.theme         !== undefined) payload.theme         = str(body.theme, 50);
    if (body.tax_rate      !== undefined) payload.tax_rate      = isNaN(tax_rate_val) ? 0 : Math.min(Math.max(tax_rate_val, 0), 100);
    if (body.tax_label     !== undefined) payload.tax_label     = str(body.tax_label, 50);
    if (body.currency      !== undefined) payload.currency      = VALID_CURRENCIES.has(body.currency) ? body.currency : "CAD";
    if (body.terms_agreed_at   !== undefined) payload.terms_agreed_at   = typeof body.terms_agreed_at === "string" ? body.terms_agreed_at : null;
    if (body.email_marketing_ok !== undefined) payload.email_marketing_ok = !!body.email_marketing_ok;

    const { data, error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" }).select().single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    return new Response(JSON.stringify(applyGrantToTier(data)), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
});
