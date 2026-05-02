import { supabase } from "../lib/supabase";
import { trackReferralAttached } from "./referrals";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token ?? ""}`,
    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export const fetchProfile = async () => {
  // On the first profile fetch after signup, attach the pending referral code so the
  // server can record it on the new profile row. Cleared once consumed.
  const pendingRef = localStorage.getItem("pending_ref_code");
  const url = pendingRef ? `${BASE}/profile?ref=${encodeURIComponent(pendingRef)}` : `${BASE}/profile`;
  const res = await fetch(url, { headers: await headers() }).then(r => r.json());
  if (pendingRef && res?.user_id) {
    localStorage.removeItem("pending_ref_code");
    if (res?.referred_by_code === pendingRef) trackReferralAttached(pendingRef);
  }
  return res;
};

export const saveProfile = async (data) =>
  fetch(`${BASE}/profile`, {
    method: "PUT",
    headers: await headers(),
    body: JSON.stringify(data),
  }).then(r => r.json());
