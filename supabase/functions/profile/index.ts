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

    // No profile yet: create a blank one on first login. Capture ?ref= from query string.
    const url = new URL(req.url);
    const refCode = url.searchParams.get("ref")?.trim().toUpperCase().slice(0, 8) || null;

    const { data: created } = await supabase.from("profiles").insert({
      user_id: user.id,
      tier: "free",
      ...(refCode ? { referred_by_code: refCode } : {}),
    }).select().single();
    return new Response(JSON.stringify(applyGrantToTier(created ?? {})), { headers: corsHeaders });
  }

  if (req.method === "PUT") {
    const body = await req.json();

    // Sanitize all profile fields: lengths are generous but bounded.
    // URL fields are validated to prevent javascript: injection via payment_url/website.
    const tax_rate_val = parseFloat(String(body.tax_rate ?? ""));
    const { data, error } = await supabase.from("profiles").upsert({
      user_id:       user.id,
      business_name: str(body.business_name, 200),
      address:       str(body.address,       400),
      email:         str(body.email,         254),
      phone:         str(body.phone,         30),
      bio:           str(body.bio,           500),
      website:       safeUrl(body.website),
      payment_url:   safeUrl(body.payment_url),
      logo_url:      str(body.logo_url,      500),
      avatar_url:    str(body.avatar_url,    500),
      ...(body.theme    !== undefined ? { theme:     str(body.theme, 50) }                                       : {}),
      ...(body.tax_rate !== undefined ? { tax_rate:  isNaN(tax_rate_val) ? 0 : Math.min(Math.max(tax_rate_val, 0), 100) } : {}),
      ...(body.tax_label !== undefined ? { tax_label: str(body.tax_label, 50) }                                  : {}),
      ...(body.currency          !== undefined ? { currency: VALID_CURRENCIES.has(body.currency) ? body.currency : "CAD" } : {}),
      ...(body.terms_agreed_at   !== undefined ? { terms_agreed_at: typeof body.terms_agreed_at === "string" ? body.terms_agreed_at : null } : {}),
      ...(body.email_marketing_ok !== undefined ? { email_marketing_ok: !!body.email_marketing_ok } : {}),
    }, { onConflict: "user_id" }).select().single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    return new Response(JSON.stringify(applyGrantToTier(data)), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
});
