import { supabase } from "../lib/supabase";

export async function startCheckout() {
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    method: "POST",
    body: { return_url: window.location.origin },
  });
  if (error) throw new Error(error.message ?? "Checkout failed.");
  if (!data?.url) throw new Error("No checkout URL returned — check Stripe secrets in Supabase.");
  window.location.href = data.url;
}
