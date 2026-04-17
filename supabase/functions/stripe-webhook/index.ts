import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createPostHogClient, isPostHogConfigured, safeShutdown } from "../_shared/posthog.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// Uses service role key — bypasses RLS to update any user's tier
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Resolve a Stripe price ID to an app tier.
// Returns null if the price is unrecognised (caller decides how to handle).
function tierFromPriceId(priceId: string | null | undefined): "pro" | "voice" | null {
  if (!priceId) return null;
  const proPriceId   = Deno.env.get("STRIPE_PRO_PRICE_ID");
  const voicePriceId = Deno.env.get("STRIPE_VOICE_PRICE_ID");
  if (priceId === voicePriceId) return "voice";
  if (priceId === proPriceId)   return "pro";
  return null;
}

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("stripe-webhook: missing stripe-signature header");
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("stripe-webhook: signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  console.log(`stripe-webhook: received ${event.type} (${event.id})`);

  // ─── checkout.session.completed ────────────────────────────────────────────
  // Fires immediately when a customer completes checkout. We retrieve the
  // subscription to read the price, then set the user's tier.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId  = session.client_reference_id;

    if (!userId) {
      console.error("stripe-webhook: checkout.session.completed — no client_reference_id");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    let tier: "pro" | "voice" = "pro"; // safe default
    const voicePriceId = Deno.env.get("STRIPE_VOICE_PRICE_ID");

    if (voicePriceId && session.subscription) {
      try {
        const sub    = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = sub.items.data[0]?.price?.id;
        const resolved = tierFromPriceId(priceId);
        if (resolved) tier = resolved;
        console.log(`stripe-webhook: checkout — userId=${userId} priceId=${priceId} tier=${tier}`);
      } catch (err) {
        console.error("stripe-webhook: could not retrieve subscription for checkout", err);
      }
    }

    const { error } = await supabase.from("profiles").upsert({
      user_id: userId,
      tier,
      stripe_customer_id:    session.customer as string,
      stripe_subscription_id: session.subscription as string,
    }, { onConflict: "user_id" });

    if (error) {
      console.error("stripe-webhook: DB upsert failed (checkout)", error);
    } else {
      console.log(`stripe-webhook: tier set to '${tier}' for userId=${userId}`);

      // Push notification — paying customer alarm
      const ntfyTopic = Deno.env.get("NTFY_TOPIC");
      if (ntfyTopic) {
        fetch(`https://ntfy.sh/${ntfyTopic}`, {
          method: "POST",
          headers: {
            "Title": "💰 Paying customer!",
            "Priority": "urgent",
            "Tags": "money_with_wings",
          },
          body: `${tier.toUpperCase()} plan activated`,
        }).catch((e) => console.error("stripe-webhook: ntfy error", e));
      }

      const ph = createPostHogClient();
      ph.identify({
        distinctId: userId,
        properties: { $set: { tier } },
      });
      ph.capture({
        distinctId: userId,
        event: "subscription activated",
        properties: {
          tier,
          stripe_session_id: session.id,
          stripe_subscription_id: session.subscription as string,
        },
      });
      await safeShutdown(ph);
    }
  }

  // ─── customer.subscription.updated ─────────────────────────────────────────
  // Fires when a subscription changes: plan switch (pro <-> voice), renewal,
  // trial end, payment failure downgrade, etc.
  // We only act when the subscription is active/trialing — not on cancelled subs
  // (those are handled by .deleted below).
  if (event.type === "customer.subscription.updated") {
    const sub    = event.data.object as Stripe.Subscription;
    const status = sub.status; // active | trialing | past_due | canceled | unpaid | ...

    if (status === "active" || status === "trialing") {
      const priceId  = sub.items.data[0]?.price?.id;
      const tier     = tierFromPriceId(priceId);

      if (!tier) {
        console.warn(`stripe-webhook: subscription.updated — unrecognised priceId=${priceId}, skipping tier update`);
      } else {
        const { error } = await supabase.from("profiles")
          .update({ tier })
          .eq("stripe_subscription_id", sub.id);

        if (error) console.error("stripe-webhook: DB update failed (subscription.updated)", error);
        else console.log(`stripe-webhook: tier updated to '${tier}' for subscriptionId=${sub.id} (status=${status})`);
      }
    } else if (status === "past_due" || status === "unpaid") {
      // Payment failed — downgrade to free immediately so access is revoked.
      // Stripe will also fire .deleted once the retry period ends; this is an
      // early safety net so a failed payment doesn't grant indefinite access.
      const { error } = await supabase.from("profiles")
        .update({ tier: "free" })
        .eq("stripe_subscription_id", sub.id);

      if (error) console.error("stripe-webhook: DB update failed (past_due downgrade)", error);
      else console.log(`stripe-webhook: tier downgraded to 'free' for subscriptionId=${sub.id} (status=${status})`);
    }
  }

  // ─── customer.subscription.deleted ─────────────────────────────────────────
  // Fires when a subscription is fully cancelled (end of billing period or
  // immediate cancel). Clear the subscription ID so .updated stops matching.
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;

    // Fetch user_id before nulling stripe_subscription_id so the lookup still matches
    const { data: profile } = await supabase.from("profiles")
      .select("user_id")
      .eq("stripe_subscription_id", sub.id)
      .single();

    const { error } = await supabase.from("profiles")
      .update({ tier: "free", stripe_subscription_id: null })
      .eq("stripe_subscription_id", sub.id);

    if (error) {
      console.error("stripe-webhook: DB update failed (subscription.deleted)", error);
    } else {
      console.log(`stripe-webhook: tier reset to 'free' for subscriptionId=${sub.id}`);
      if (profile?.user_id) {
        const ph = createPostHogClient();
        ph.identify({
          distinctId: profile.user_id,
          properties: { $set: { tier: "free" } },
        });
        ph.capture({
          distinctId: profile.user_id,
          event: "subscription downgraded",
          properties: { stripe_subscription_id: sub.id },
        });
        await safeShutdown(ph);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
