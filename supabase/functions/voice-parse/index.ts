import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB cap
const DAILY_LIMIT = 20; // max voice parses per user per day

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  // Auth
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  // Server-side tier check — voice tier only
  const { data: profile } = await supabase.from("profiles").select("tier").eq("user_id", user.id).single();
  if (profile?.tier !== "voice") {
    return new Response(JSON.stringify({ error: "Voice parsing requires the Voice tier." }), { status: 403, headers: corsHeaders });
  }

  // Daily rate limit — check usage count in DB
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const { count } = await supabase
    .from("voice_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("date", today);

  if ((count ?? 0) >= DAILY_LIMIT) {
    return new Response(JSON.stringify({ error: "Daily voice parsing limit reached. Try again tomorrow." }), { status: 429, headers: corsHeaders });
  }

  // Read audio body
  const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_AUDIO_BYTES) {
    return new Response(JSON.stringify({ error: "Audio file too large. Max 10 MB." }), { status: 413, headers: corsHeaders });
  }

  const audioBlob = await req.blob();
  if (audioBlob.size > MAX_AUDIO_BYTES) {
    return new Response(JSON.stringify({ error: "Audio file too large. Max 10 MB." }), { status: 413, headers: corsHeaders });
  }

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) return new Response(JSON.stringify({ error: "Voice parsing not configured." }), { status: 500, headers: corsHeaders });

  // Step 1: Transcribe with Groq Whisper
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
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
    return new Response(JSON.stringify({ error: "Transcription failed. Please try again." }), { status: 502, headers: corsHeaders });
  }

  const transcript = await whisperRes.text();
  if (!transcript?.trim()) {
    return new Response(JSON.stringify({ error: "No speech detected. Please try again." }), { status: 422, headers: corsHeaders });
  }

  // Step 2: Extract invoice fields with Groq LLaMA
  const extractRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You extract invoice data from spoken descriptions. Return ONLY valid JSON with these fields:
{
  "vendor_name": string or null,
  "customer_name": string or null,
  "notes": string or null,
  "line_items": [
    { "description": string, "quantity": number, "unit_price": number }
  ]
}
Rules:
- quantity defaults to 1 if not mentioned
- unit_price must be a number (no currency symbols)
- If a field is not mentioned, set it to null or empty array
- Do not invent data not present in the transcript`
        },
        {
          role: "user",
          content: `Extract invoice data from this transcript: "${transcript}"`
        }
      ]
    }),
  });

  if (!extractRes.ok) {
    const err = await extractRes.text();
    console.error("LLaMA error:", err);
    return new Response(JSON.stringify({ error: "Extraction failed. Please try again." }), { status: 502, headers: corsHeaders });
  }

  const extractJson = await extractRes.json();
  let parsed;
  try {
    parsed = JSON.parse(extractJson.choices[0].message.content);
  } catch {
    return new Response(JSON.stringify({ error: "Could not parse invoice data. Please try again." }), { status: 422, headers: corsHeaders });
  }

  // Log usage for rate limiting (fire and forget)
  supabase.from("voice_usage").insert({ user_id: user.id, date: today }).then(() => {});

  return new Response(JSON.stringify({ transcript, parsed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
