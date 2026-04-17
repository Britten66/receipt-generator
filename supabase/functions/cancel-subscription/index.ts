/*
  cancel-subscription — lets a Pro user cancel their monthly subscription.

  Sets cancel_at_period_end: true on Stripe — the user keeps Pro access until
  the current billing period ends, then the customer.subscription.deleted webhook
  fires and the stripe-webhook function resets their tier to "free".

  This is required by FTC rules and Canadian consumer protection law —
  users must be able to cancel without contacting support.
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createPostHogClient, isPostHogConfigured, safeShutdown } from "../_shared/posthog.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, tier")
    .eq("user_id", user.id)
    .single();

  if (!profile?.stripe_subscription_id) {
    return new Response(JSON.stringify({ error: "No active subscription found." }), { status: 400, headers: corsHeaders });
  }

  try {
    // cancel_at_period_end keeps access until billing period ends — does NOT immediately revoke.
    const sub = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    const cancelDate = new Date((sub.cancel_at ?? sub.current_period_end) * 1000)
      .toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

    const ph = createPostHogClient();
    ph.capture({
      distinctId: user.id,
      event: "subscription cancelled",
      properties: {
        tier: profile.tier,
        cancel_at: cancelDate,
        stripe_subscription_id: profile.stripe_subscription_id,
      },
    });
    await safeShutdown(ph);

    return new Response(JSON.stringify({
      ok: true,
      cancel_at: cancelDate,
      period_end_ts: sub.current_period_end,
    }), { headers: corsHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("cancel-subscription error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
