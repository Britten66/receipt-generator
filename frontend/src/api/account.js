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

export async function deleteAccount() {
  const res = await fetch(`${BASE}/delete-account`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error);
  return body;
}
