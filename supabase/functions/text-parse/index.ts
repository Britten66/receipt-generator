import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
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
  // Auth
  const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"), {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization")
      }
    }
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({
    error: "Unauthorized"
  }), {
    status: 401,
    headers: corsHeaders
  });
  // Voice tier only
  const { data: profile } = await supabase.from("profiles").select("tier").eq("user_id", user.id).single();
  if (profile?.tier !== "voice") {
    return new Response(JSON.stringify({
      error: "AI parsing requires the Voice AI tier."
    }), {
      status: 403,
      headers: corsHeaders
    });
  }
  // Daily rate limit — shared voice_usage table with voice-parse
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase.from("voice_usage").select("*", {
    count: "exact",
    head: true
  }).eq("user_id", user.id).eq("date", today);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return new Response(JSON.stringify({
      error: "Daily AI limit reached. Try again tomorrow."
    }), {
      status: 429,
      headers: corsHeaders
    });
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
  // Extract invoice fields with Groq LLaMA — same prompt as voice-parse
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

Output format:
{
  "vendor_name": string or null,
  "customer_name": string or null,
  "currency": "CAD" or "USD" or "EUR" or "GBP" or other ISO 4217 code,
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
- quantity: extract from ANY of these patterns — "4 apples" → qty 4, "apples x4" → qty 4, "3 hours" → qty 3, "two units" → qty 2, "x5" → qty 5. Written numbers like "two", "three" count too. Default to 1 only if truly no quantity is mentioned.
- description: the item name only, never include the quantity in the description. "4 apples" → description "Apples", quantity 4.
- unit_price: price PER UNIT. Extract from "at $85", "for 200", "90 each", "fifty bucks", "$10/unit". If a total price is given with a quantity, divide: "4 apples for $8" → unit_price 2.
- currency: detect from explicit mentions like "USD", "US dollars", "Canadian dollars", "CAD", "euros", "pounds". Default to "CAD" if not mentioned.
- notes: payment terms, thank you messages, or extra info. Not item descriptions.
- If a field is not mentioned set it to null or empty array.
- Do not invent data not present in the description.
- Always return line_items as an array even if only one item.

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
  // Log usage (fire and forget)
  supabase.from("voice_usage").insert({
    user_id: user.id,
    date: today
  }).then(()=>{});
  return new Response(JSON.stringify({
    parsed
  }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
});
