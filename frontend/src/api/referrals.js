import posthog from "posthog-js";
import { supabase } from "../lib/supabase";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token ?? ""}`,
    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export const fetchReferralInfo = async () =>
  fetch(`${BASE}/referral-info`, { headers: await authHeaders() }).then((r) => r.json());

// Capture ?ref=CODE on the landing page and stash it for the post-signup profile fetch
// to consume. Idempotent: a non-empty existing value is preserved unless explicitly cleared.
export function captureRefFromUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref")?.trim().toUpperCase().slice(0, 8);
  if (!ref) return;
  if (!/^[A-Z0-9]+$/.test(ref)) return;
  localStorage.setItem("pending_ref_code", ref);
  try { posthog.capture("referral_link_visited", { code: ref }); } catch { /* posthog optional */ }
}

export function trackReferralCopied(code) {
  try { posthog.capture("referral_code_copied", { code }); } catch { /* posthog optional */ }
}

export function trackReferralAttached(code) {
  try { posthog.capture("referral_signup_attached", { code }); } catch { /* posthog optional */ }
}

export function trackReferralGrantSeen(daysRemaining, friendsReferred) {
  try { posthog.capture("referral_grant_seen", { days_remaining: daysRemaining, friends_referred: friendsReferred }); } catch { /* posthog optional */ }
}
