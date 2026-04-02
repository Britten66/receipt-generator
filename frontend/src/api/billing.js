import { supabase } from "../lib/supabase";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export async function startCheckout() {
  const { data: { session } } = await supabase.auth.refreshSession();
  const t = session?.access_token ?? "";

  const res = await fetch(`${BASE}/stripe-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${t}`,
      "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ return_url: window.location.origin }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error);
  if (!body.url) throw new Error(`No checkout URL. Response: ${JSON.stringify(body)}`);
  window.location.href = body.url;
}
