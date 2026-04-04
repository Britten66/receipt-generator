import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB cap
const DAILY_LIMIT = 20; // max voice parses per user per day
Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: corsHeaders,
  });

  // Auth — verify JWT using user-scoped client
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.log("auth-fail:", authError?.message ?? "no user");
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  // Use service role client to fetch profile — bypasses RLS, safe because user is already verified above
  const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false }
  });
  const { data: profile, error: profileError } = await adminClient.from("profiles").select("tier, business_name").eq("user_id", user.id).single();
  console.log("tier-check:", user.id, "tier:", profile?.tier, "err:", profileError?.message);
  if (profile?.tier !== "voice") {
    return new Response(JSON.stringify({ error: "Voice parsing requires the Voice tier." }), { status: 403, headers: corsHeaders });
  }

  // Daily rate limit — skip for admin users listed in ADMIN_USER_IDS (comma-separated)
  const adminIds = (Deno.env.get("ADMIN_USER_IDS") ?? "").split(",").map(s => s.trim()).filter(Boolean);
  const isAdmin = adminIds.includes(user.id);
  if (!isAdmin) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const { count } = await supabase.from("voice_usage").select("*", { count: "exact", head: true })
      .eq("user_id", user.id).eq("date", today);
    if ((count ?? 0) >= DAILY_LIMIT) {
      return new Response(JSON.stringify({ error: "Daily voice parsing limit reached. Try again tomorrow." }), {
        status: 429,
        headers: corsHeaders,
      });
    }
  }

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) return new Response(JSON.stringify({ error: "Voice parsing not configured." }), {
    status: 500,
    headers: corsHeaders,
  });

  // Parse storage path from JSON body — client uploads audio to Supabase Storage first
  // to bypass the 1 MB edge function body limit enforced by the gateway.
  let storagePath: string;
  try {
    const body = await req.json();
    storagePath = (body.storage_path ?? "").trim();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), { status: 400, headers: corsHeaders });
  }
  if (!storagePath) {
    return new Response(JSON.stringify({ error: "No audio provided." }), { status: 422, headers: corsHeaders });
  }

  // Security: storage path must belong to the authenticated user
  if (!storagePath.startsWith(`${user.id}/`)) {
    return new Response(JSON.stringify({ error: "Unauthorized storage path." }), { status: 403, headers: corsHeaders });
  }

  // Fetch audio from Supabase Storage via a short-lived signed URL
  const { data: signedData, error: signedError } = await supabase.storage
    .from("audio-temp")
    .createSignedUrl(storagePath, 60); // 60-second TTL — used immediately

  if (signedError || !signedData?.signedUrl) {
    console.error("signed-url error:", signedError?.message);
    return new Response(JSON.stringify({ error: "Could not access audio. Please try again." }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const audioRes = await fetch(signedData.signedUrl);
  if (!audioRes.ok) {
    return new Response(JSON.stringify({ error: "Could not retrieve audio. Please try again." }), {
      status: 502,
      headers: corsHeaders,
    });
  }
  const audioBuffer = await audioRes.arrayBuffer();

  // Clean up temp file (fire and forget — don't block the response)
  supabase.storage.from("audio-temp").remove([storagePath]).then(() => {});

  if (audioBuffer.byteLength === 0) {
    return new Response(JSON.stringify({ error: "No audio received. Please try again." }), {
      status: 422,
      headers: corsHeaders,
    });
  }
  if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
    return new Response(JSON.stringify({ error: "Audio file too large. Max 10 MB." }), {
      status: 413,
      headers: corsHeaders,
    });
  }

  // Detect mime type from storage path extension
  const ext = storagePath.split(".").pop() ?? "webm";
  const contentType = ext === "mp4" ? "audio/mp4"
    : ext === "ogg" ? "audio/ogg"
    : ext === "wav" ? "audio/wav"
    : "audio/webm";

  const audioBlob = new Blob([audioBuffer], { type: contentType });
  const formData = new FormData();
  formData.append("file", audioBlob, `audio.${ext}`);
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("response_format", "text");

  const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${groqKey}` },
    body: formData,
  });
  if (!whisperRes.ok) {
    const err = await whisperRes.text();
    console.error("Whisper error:", err);
    return new Response(JSON.stringify({ error: "Transcription failed. Please try again." }), {
      status: 502,
      headers: corsHeaders,
    });
  }

  const transcript = await whisperRes.text();
  if (!transcript?.trim()) {
    return new Response(JSON.stringify({ error: "No speech detected. Please try again." }), {
      status: 422,
      headers: corsHeaders,
    });
  }

  // RAG: pull the user's past invoice history to give the model user-specific context.
  // This lets the model recognise recurring clients and typical service prices.
  // Non-fatal — if the query fails for any reason, we proceed without context.
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
      if (customerNames.length) parts.push(`Past clients (use for name matching if the speaker is vague): ${customerNames.join(", ")}`);
      if (commonItems.length) parts.push(`Common services and typical unit prices: ${commonItems.join("; ")}`);
      if (parts.length) {
        ragContext = `\nUser invoice history — use as hints when the description is vague, but do NOT override anything explicitly stated:\n${parts.join("\n")}`;
      }
    }
  } catch {
    // RAG failure is non-fatal — the model still parses without history
  }

  // Step 2: Extract invoice fields with Groq LLaMA
  const extractRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You extract invoice data from spoken invoice descriptions. Return ONLY valid JSON.
${profile?.business_name ? `\nContext: The person speaking is invoicing FROM "${profile.business_name}". Use this as vendor_name unless they explicitly say a different business name.` : ""}
${profile?.currency ? `\nDefault currency: ${profile.currency}. Use this unless the speaker explicitly mentions a different currency.` : ""}${ragContext}
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
- vendor_name is who is ISSUING the invoice (the speaker's business). Often said as "from [name]" or "my business is [name]" or "this is [name] invoicing".
- customer_name is who is RECEIVING the invoice (the client). Often said as "to [name]" or "for [name]" or "invoicing [name]".
- currency: detect from explicit mentions like "USD", "US dollars", "Canadian dollars", "CAD", "euros", "pounds". Default to "CAD" if not mentioned.
- CRITICAL: Every distinct product or service MUST be its own separate object in the line_items array. NEVER combine two services into one description. "web service and paint service" = TWO items. "design, hosting, and support" = THREE items. The word "and" or a comma between services always means a new line item.
- quantity: extract from ANY of these patterns — "4 apples" → qty 4, "apples x4" → qty 4, "3 hours" → qty 3, "two units" → qty 2, "x5" → qty 5. Written numbers like "two", "three" count too. Default to 1 only if truly no quantity is mentioned.
- description: the item name only, never include the quantity in the description. "4 apples" → description "Apples", quantity 4.
- unit_price: price PER UNIT. Extract from "at $85", "for 200", "90 each", "fifty bucks", "$10/unit". If a total price is given with a quantity, divide: "4 apples for $8" → unit_price 2.
- notes: payment terms, thank you messages, or extra info. Not item descriptions.
- If a field is not mentioned set it to null or empty array.
- Do not invent data not present in the transcript.
- Always return line_items as an array even if only one item.

Examples:
- "4 apples at 2 dollars each" → [{ description: "Apples", quantity: 4, unit_price: 2 }]
- "web design and hosting" → two items, quantity 1 each
- "invoice John for 3 hours of consulting at $85" → [{ description: "Consulting", quantity: 3, unit_price: 85 }]
- "5 widgets for $50 total" → [{ description: "Widgets", quantity: 5, unit_price: 10 }]`,
        },
        {
          role: "user",
          content: `Extract invoice data from this spoken description: "${transcript}"`,
        },
      ],
    }),
  });
  if (!extractRes.ok) {
    const err = await extractRes.text();
    console.error("LLaMA error:", err);
    return new Response(JSON.stringify({ error: "Extraction failed. Please try again." }), {
      status: 502,
      headers: corsHeaders,
    });
  }

  const extractJson = await extractRes.json();
  let parsed;
  try {
    const raw = extractJson.choices[0].message.content;
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : raw);
  } catch {
    console.error("LLaMA JSON parse failed:", extractJson.choices?.[0]?.message?.content);
    return new Response(JSON.stringify({ error: "Could not parse invoice data. Please try again." }), {
      status: 422,
      headers: corsHeaders,
    });
  }

  // Log usage for rate limiting (fire and forget)
  supabase.from("voice_usage").insert({ user_id: user.id, date: today }).then(() => {});

  return new Response(JSON.stringify({ transcript, parsed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
