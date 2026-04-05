/*
  subscription-status — returns current Stripe subscription state for the
  authenticated user, used by BillingModal to show next charge date.

  Returns: { current_period_end: "April 30, 2026", cancel_at_period_end: false, status: "active" }
  If no subscription: { status: "free" }
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { getCorsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.stripe_subscription_id) {
    return new Response(JSON.stringify({ status: "free" }), { headers: corsHeaders });
  }

  try {
    const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);

    const fmt = (ts: number) =>
      new Date(ts * 1000).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    return new Response(JSON.stringify({
      status: sub.status,
      current_period_end: fmt(sub.current_period_end),
      cancel_at_period_end: sub.cancel_at_period_end,
      cancel_at: sub.cancel_at ? fmt(sub.cancel_at) : null,
    }), { headers: corsHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("subscription-status error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
