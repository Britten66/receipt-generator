import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/*
  notify-interest: fires an ntfy push when a signed-in user clicks a plan
  card in PlansModal (top-of-funnel purchase intent, before checkout starts).

  The ntfy topic is a secret and must stay server-side - this endpoint exists
  so the frontend never has to embed it. Requires a real signed-in user so it
  can't be hit anonymously; each call is one deliberate button click, not a
  high-frequency endpoint, so no separate rate limit table for this.
*/

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const plan = body?.plan === "voice" ? "voice" : "pro";
  const label = plan === "voice" ? "Voice AI" : "Pro";

  const ntfyTopic = Deno.env.get("NTFY_TOPIC");
  if (ntfyTopic) {
    fetch(`https://ntfy.sh/${ntfyTopic}`, {
      method: "POST",
      headers: {
        "Title": `\u{1F440} ${label} card clicked`,
        "Priority": "default",
        "Tags": "eyes",
      },
      body: `${user.email ?? user.id} clicked ${label}`,
    }).catch((e) => console.error("notify-interest: ntfy error", e));
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
});
