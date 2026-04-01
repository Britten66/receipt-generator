const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// Redirects user to Stripe hosted checkout for the Pro plan.
// Call this when the user clicks "Upgrade to Pro".
export async function startCheckout(token) {
  const res = await fetch(`${BASE}/stripe-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify({ return_url: window.location.origin }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error);
  if (!body.url) throw new Error("No checkout URL returned — check Stripe secrets in Supabase.");
  window.location.href = body.url;
}
