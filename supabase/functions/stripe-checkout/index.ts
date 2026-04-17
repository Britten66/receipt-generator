import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno&no-check";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createPostHogClient, isPostHogConfigured, safeShutdown } from "../_shared/posthog.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const MAX_BODY_BYTES = 4 * 1024; // 4 KB

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

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
  if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { return_url, tier, currency } = await req.json();

  const isUSD = currency === "USD";
  const priceId = tier === "voice"
    ? (isUSD ? Deno.env.get("STRIPE_VOICE_PRICE_ID_USD")! : Deno.env.get("STRIPE_VOICE_PRICE_ID")!)
    : (isUSD ? Deno.env.get("STRIPE_PRO_PRICE_ID_USD")!   : Deno.env.get("STRIPE_PRO_PRICE_ID")!);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${return_url}?upgraded=true`,
      cancel_url: return_url,
      client_reference_id: user.id,
      customer_email: user.email,
    });

    // Notify owner of checkout entry — no GA, this is our only conversion signal.
    const ownerNotifyRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      },
      body: JSON.stringify({
        from: "InvoicePrepper <invoices@invoiceprepper.com>",
        to: "support@invoiceprepper.com",
        subject: "Checkout started",
        html: `<p>A user just entered the Pro checkout flow.</p><p><strong>Email:</strong> ${user.email}</p><p><strong>Time:</strong> ${new Date().toUTCString()}</p>`,
      }),
    });
    if (!ownerNotifyRes.ok) console.error("Owner notify failed:", await ownerNotifyRes.text());

    const ph = createPostHogClient();
    ph.capture({
      distinctId: user.id,
      event: "checkout started",
      properties: {
        tier,
        currency,
        stripe_session_id: session.id,
      },
    });
    await safeShutdown(ph);

    return new Response(JSON.stringify({ url: session.url }), { headers: corsHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
