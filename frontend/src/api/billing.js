import { supabase } from "../lib/supabase";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function authHeaders() {
  const { data: { session } } = await supabase.auth.refreshSession();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token ?? ""}`,
    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export async function startCheckout() {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/stripe-checkout`, {
    method: "POST",
    headers,
    body: JSON.stringify({ return_url: window.location.origin }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error);
  if (!body.url) throw new Error(`No checkout URL. Response: ${JSON.stringify(body)}`);
  window.location.href = body.url;
}

export async function cancelSubscription() {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/cancel-subscription`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error);
  return body; // { ok: true, cancel_at: "May 2, 2026" }
}

export async function openBillingPortal() {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/billing-portal`, {
    method: "POST",
    headers,
    body: JSON.stringify({ return_url: window.location.origin }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error);
  if (!body.url) throw new Error("No portal URL returned.");
  window.location.href = body.url;
}
