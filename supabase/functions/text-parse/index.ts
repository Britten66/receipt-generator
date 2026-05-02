import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createPostHogClient, isPostHogConfigured, safeShutdown } from "../_shared/posthog.ts";
const DAILY_LIMIT = 20; // shared with voice-parse
Deno.serve(async (req)=>{
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: corsHeaders
  });
  if (req.method !== "POST") return new Response(JSON.stringify({
    error: "Method not allowed"
  }), {
    status: 405,
    headers: corsHeaders
  });
  // Auth: verify JWT using user-scoped client
  const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: req.headers.get("Authorization") } }
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.log("auth-fail:", authError?.message ?? "no user");
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  // Use service role client to fetch profile: bypasses RLS, safe because user is already verified above
  const adminClient = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false }
  });
  const { data: profile, error: profileError } = await adminClient.from("profiles").select("tier, business_name").eq("user_id", user.id).single();
  console.log("tier-check:", user.id, "tier:", profile?.tier, "err:", profileError?.message);
  const tier = profile?.tier ?? "free";

  // Free tier has no text AI access
  if (tier === "free") {
    return new Response(JSON.stringify({ error: "Text AI requires the Pro plan or higher." }), { status: 403, headers: corsHeaders });
  }

  // Rate limiting by tier: skip for admins
  const adminIds = (Deno.env.get("ADMIN_USER_IDS") ?? "").split(",").map(s => s.trim()).filter(Boolean);
  const isAdmin = adminIds.includes(user.id);
  const today = new Date().toISOString().slice(0, 10);

  if (!isAdmin) {
    if (tier === "pro") {
      // Pro tier: 15 text parses per day, resets at midnight UTC.
      // Insert-then-count to bound concurrent overshoot on the Groq bill.
      // See send-invoice for the full rationale.
      const { error: insertError } = await supabase.from("voice_usage").insert({ user_id: user.id, date: today });
      if (insertError) {
        console.error("voice_usage insert failed:", insertError);
        return new Response(JSON.stringify({ error: "Rate limit check failed" }), { status: 500, headers: corsHeaders });
      }
      const { count } = await supabase.from("voice_usage").select("*", { count: "exact", head: true })
        .eq("user_id", user.id).eq("date", today);
      if ((count ?? 0) > 15) {
        return new Response(JSON.stringify({
          error: "Daily AI limit reached. Try again tomorrow."
        }), { status: 429, headers: corsHeaders });
      }
    }
    // Voice AI tier: unlimited text parsing, logged at the bottom for analytics
  }
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) return new Response(JSON.stringify({
    error: "AI parsing not configured."
  }), {
    status: 500,
    headers: corsHeaders
  });
  // Parse text from request body
  let text = "";
  try {
    const body = await req.json();
    text = (body.text ?? "").trim();
  } catch  {
    return new Response(JSON.stringify({
      error: "Invalid request body."
    }), {
      status: 400,
      headers: corsHeaders
    });
  }
  if (!text) {
    return new Response(JSON.stringify({
      error: "No text provided."
    }), {
      status: 422,
      headers: corsHeaders
    });
  }

  // RAG: pull the user's past invoice history to give the model user-specific context.
  // This lets the model recognise recurring clients and typical service prices.
  // Non-fatal: if the query fails for any reason, we proceed without context.
  let ragContext = "";
  try {
    const { data: history } = await supabase
      .from("receipts")
      .select("customer_name, line_items(description, unit_price)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25);

    if (history?.length) {
      // Sanitise a value for safe prompt injection (strip newlines and quotes)
      const clean = (s: string, max = 60) => s.replace(/[\r\n"\\]/g, " ").trim().slice(0, max);

      // Distinct customer names, most recent first
      const seenNames = new Set<string>();
      const customerNames: string[] = [];
      for (const r of history) {
        const name = r.customer_name ? clean(r.customer_name) : null;
        if (name && !seenNames.has(name)) {
          seenNames.add(name);
          customerNames.push(name);
          if (customerNames.length >= 12) break;
        }
      }

      // Common line item descriptions grouped by description, avg unit_price
      const itemMap = new Map<string, { total: number; count: number }>();
      for (const r of history) {
        for (const li of (r.line_items ?? []) as Array<{ description: string; unit_price: number }>) {
          const desc = li.description ? clean(li.description) : null;
          if (!desc || li.unit_price == null) continue;
          const prev = itemMap.get(desc) ?? { total: 0, count: 0 };
          itemMap.set(desc, { total: prev.total + li.unit_price, count: prev.count + 1 });
        }
      }
      const commonItems = [...itemMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([desc, { total, count }]) => `"${desc}" at $${(total / count).toFixed(2)}/unit`);

      const parts: string[] = [];
      if (customerNames.length) parts.push(`Known clients: ${customerNames.join(", ")}. If the input contains a partial name, abbreviation, or likely typo that closely matches any name in this list, use the full name from the list. Example: "jon smth" should resolve to "John Smith" if that is a known client. Prefer a history match over the literal input when the match is confident.`);
      if (commonItems.length) parts.push(`Common services and typical unit prices: ${commonItems.join("; ")}. If a service description appears to be a typo or shorthand for a known service, normalize it to the known description.`);
      if (parts.length) {
        ragContext = `\nUser invoice history. Use this data actively: correct typos, expand abbreviations, and normalize names and service descriptions against the lists below. Only correct when there is a confident match. Do not invent data.\n${parts.join("\n")}`;
      }
    }
  } catch {
    // RAG failure is non-fatal: the model still parses without history
  }

  // Extract invoice fields with Groq LLaMA: same prompt as voice-parse
  const extractRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: "system",
          content: `You extract invoice data from invoice descriptions. Return ONLY valid JSON.
${profile?.business_name ? `\nContext: The user's business is "${profile.business_name}". Use this as vendor_name unless they explicitly mention a different business name.` : ""}
${profile?.currency ? `\nDefault currency: ${profile.currency}. Use this unless explicitly overridden in the description.` : ""}${ragContext}
Output format:
{
  "vendor_name": string or null,
  "customer_name": string or null,
  "currency": "CAD" or "USD" or "EUR" or "GBP" or other ISO 4217 code,
  "tax_rate": number or null,
  "notes": string or null,
  "line_items": [
    { "description": string, "quantity": number, "unit_price": number }
  ]
}

Rules:
- vendor_name is who is ISSUING the invoice. Often said as "from [name]" or "my business is [name]" or "this is [name] invoicing".
- customer_name is who is RECEIVING the invoice. Often said as "to [name]" or "for [name]" or "invoicing [name]".
- currency: detect from explicit mentions like "USD", "US dollars", "Canadian dollars", "CAD", "euros", "pounds". Default to "CAD" if not mentioned.
- CRITICAL: Every distinct product or service MUST be its own separate object in the line_items array. NEVER combine two services into one description. "web service and paint service" = TWO items. "design, hosting, and support" = THREE items. The word "and" or a comma between services always means a new line item.
- quantity: extract from ANY of these patterns: "4 apples" → qty 4, "apples x4" → qty 4, "3 hours" → qty 3, "two units" → qty 2, "x5" → qty 5. Written numbers like "two", "three" count too. Default to 1 only if truly no quantity is mentioned.
- description: the item name only, never include the quantity in the description. "4 apples" → description "Apples", quantity 4.
- unit_price: price PER UNIT. Extract from "at $85", "for 200", "90 each", "fifty bucks", "$10/unit". If a total price is given with a quantity, divide: "4 apples for $8" → unit_price 2.
- currency: detect from explicit mentions like "USD", "US dollars", "Canadian dollars", "CAD", "euros", "pounds". Default to "CAD" if not mentioned.
- tax_rate: extract the tax percentage if mentioned (e.g. "15% GST" → 15, "plus HST" → 13, "tax exempt" or "no tax" → 0). Return as a plain number (not a decimal). null if tax is not mentioned at all.
- notes: payment terms, thank you messages, or extra info. Not item descriptions. Never put tax info in notes.
- If a field is not mentioned set it to null or empty array.
- Do not invent data not present in the description.
- Always return line_items as an array even if only one item.
- Spelling and name correction: if a client name or service description is a plausible typo, abbreviation, or partial match of an entry in the user invoice history, use the corrected version from history. Only apply a correction when the match is confident. Never invent a name that is not in the input or history.

Examples:
- "4 apples at 2 dollars each" → [{ description: "Apples", quantity: 4, unit_price: 2 }]
- "web design and hosting" → two items, quantity 1 each
- "invoice John for 3 hours of consulting at $85" → [{ description: "Consulting", quantity: 3, unit_price: 85 }]
- "5 widgets for $50 total" → [{ description: "Widgets", quantity: 5, unit_price: 10 }]`
        },
        {
          role: "user",
          content: `Extract invoice data from this description: "${text}"`
        }
      ]
    })
  });
  if (!extractRes.ok) {
    const err = await extractRes.text();
    console.error("LLaMA error:", err);
    return new Response(JSON.stringify({
      error: "Extraction failed. Please try again."
    }), {
      status: 502,
      headers: corsHeaders
    });
  }
  const extractJson = await extractRes.json();
  let parsed;
  try {
    const raw = extractJson.choices[0].message.content;
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : raw);
  } catch  {
    console.error("LLaMA JSON parse failed:", extractJson.choices?.[0]?.message?.content);
    return new Response(JSON.stringify({
      error: "Could not parse invoice data. Please try again."
    }), {
      status: 422,
      headers: corsHeaders
    });
  }
  // Log usage for Voice tier (Pro already inserted up front for the rate-limit check).
  // Admins are never logged.
  if (!isAdmin && tier !== "pro") {
    supabase.from("voice_usage").insert({
      user_id: user.id,
      date: today
    }).then(()=>{});
  }

  const ph = createPostHogClient();
  ph.capture({
    distinctId: user.id,
    event: "text parse completed",
    properties: {
      line_item_count: parsed?.line_items?.length ?? 0,
      has_rag_context: ragContext.length > 0,
    },
  });
  await safeShutdown(ph);

  return new Response(JSON.stringify({
    parsed
  }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
});
