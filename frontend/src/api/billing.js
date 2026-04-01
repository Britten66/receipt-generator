const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// Redirects user to Stripe hosted checkout for the Pro plan.
// Call this when the user clicks "Upgrade to Pro".
export async function startCheckout(token) {
  const res = await fetch(`${BASE}/stripe-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ return_url: window.location.origin }),
  });
  const { url, error } = await res.json();
  if (error) throw new Error(error);
  window.location.href = url;
}
