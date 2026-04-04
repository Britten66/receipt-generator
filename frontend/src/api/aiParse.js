/*
  aiParse.js — helpers for AI-powered invoice parsing.

  parseText(text) — calls text-parse edge function with a typed description.
  parseAudio(blob, mimeType) — calls voice-parse edge function with an audio blob.
  mapParsedToForm(parsed) — converts AI output into { fields, items } ready to set in form state.
*/

import { supabase } from "../lib/supabase";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function authHeaders() {
  // getSession returns cached token (fast). If none, force a refresh.
  // Using both handles mobile iOS where sessions expire mid-recording.
  let { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const { data } = await supabase.auth.refreshSession();
    session = data.session;
  }
  const token = session?.access_token ?? "";
  if (!token) throw new Error("Session expired. Please sign in again.");
  return {
    "Authorization": `Bearer ${token}`,
    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export async function parseText(text) {
  const res = await fetch(`${BASE}/text-parse`, {
    method: "POST",
    headers: { ...await authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json.parsed;
}

export async function parseAudio(blob, mimeType) {
  // Upload audio to temporary storage — Supabase edge functions have a 1 MB body limit
  // that the gateway enforces before Deno code runs. Sending the path as JSON instead
  // keeps the request tiny; the edge function fetches the audio server-side.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const ext = mimeType.includes("mp4") ? "mp4"
    : mimeType.includes("ogg") ? "ogg"
    : mimeType.includes("wav") ? "wav"
    : "webm";
  const storagePath = `${user.id}/audio-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("audio-temp")
    .upload(storagePath, blob, { contentType: mimeType });

  if (uploadError) throw new Error("Audio upload failed. Please try again.");

  const res = await fetch(`${BASE}/voice-parse`, {
    method: "POST",
    headers: { ...await authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ storage_path: storagePath }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json; // { transcript, parsed }
}

/*
  Maps the AI-parsed object into two pieces of form state:
    fields — top-level form fields to set (vendor_name, customer_name, notes)
    items  — array of line items in the shape ReceiptForm expects, or null if none
*/
// Strip em dashes, en dashes, and other junk characters AI models sometimes insert
export function clean(str) {
  if (!str) return str;
  return String(str)
    .replace(/[\u2014\u2013\u2012\u2015]/g, "-") // em dash, en dash → hyphen
    .replace(/[\u2018\u2019]/g, "'")              // curly single quotes → straight
    .replace(/[\u201C\u201D]/g, '"')              // curly double quotes → straight
    .trim();
}

export function mapParsedToForm(parsed) {
  const fields = {};
  if (parsed.vendor_name)      fields.vendor_name   = clean(parsed.vendor_name);
  if (parsed.customer_name)    fields.customer_name = clean(parsed.customer_name);
  if (parsed.currency)         fields.currency      = parsed.currency;
  if (parsed.notes)            fields.notes         = clean(parsed.notes);
  if (parsed.tax_rate != null) fields.taxRate       = String(parsed.tax_rate);

  const items = parsed.line_items?.length
    ? parsed.line_items.map((li) => {
        const qty   = parseFloat(li.quantity)   || 1;
        const price = parseFloat(li.unit_price) || 0;
        return {
          description: clean(li.description) || "",
          quantity:    String(qty),
          unit_price:  String(price),
          total:       String((qty * price).toFixed(2)),
        };
      })
    : null;

  return { fields, items };
}
