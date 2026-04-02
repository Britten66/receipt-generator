import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { getCorsHeaders } from "../_shared/cors.ts";

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

  const { return_url } = await req.json();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: Deno.env.get("STRIPE_PRO_PRICE_ID")!, quantity: 1 }],
      success_url: `${return_url}?upgraded=true`,
      cancel_url: return_url,
      client_reference_id: user.id,
      customer_email: user.email,
    });
    return new Response(JSON.stringify({ url: session.url }), { headers: corsHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
