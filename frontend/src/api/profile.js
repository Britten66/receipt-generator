import { supabase } from "../lib/supabase";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token ?? ""}`,
    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export const fetchProfile = async () =>
  fetch(`${BASE}/profile`, { headers: await headers() }).then(r => r.json());

export const saveProfile = async (data) =>
  fetch(`${BASE}/profile`, {
    method: "PUT",
    headers: await headers(),
    body: JSON.stringify(data),
  }).then(r => r.json());
