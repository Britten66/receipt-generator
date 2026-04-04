/*
  aiParse.js — helpers for AI-powered invoice parsing.

  parseText(text) — calls text-parse edge function with a typed description.
  parseAudio(blob, mimeType) — calls voice-parse edge function with an audio blob.
  mapParsedToForm(parsed) — converts AI output into { fields, items } ready to set in form state.
*/

import { supabase } from "../lib/supabase";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Authorization": `Bearer ${session?.access_token ?? ""}`,
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
  const res = await fetch(`${BASE}/voice-parse`, {
    method: "POST",
    headers: { ...await authHeaders(), "Content-Type": mimeType, "content-length": String(blob.size) },
    body: blob,
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
export function mapParsedToForm(parsed) {
  const fields = {};
  if (parsed.vendor_name)   fields.vendor_name   = parsed.vendor_name;
  if (parsed.customer_name) fields.customer_name = parsed.customer_name;
  if (parsed.notes)         fields.notes         = parsed.notes;

  const items = parsed.line_items?.length
    ? parsed.line_items.map((li) => {
        const qty   = parseFloat(li.quantity)   || 1;
        const price = parseFloat(li.unit_price) || 0;
        return {
          description: li.description || "",
          quantity:    String(qty),
          unit_price:  String(price),
          total:       String((qty * price).toFixed(2)),
        };
      })
    : null;

  return { fields, items };
}
