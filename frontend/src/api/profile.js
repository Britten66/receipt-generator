import { supabase } from "../lib/supabase";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const authHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token ?? ""}`,
  };
};

export const fetchProfile = async () => {
  const res = await fetch(`${API}/api/profile`, { headers: await authHeaders() });
  return res.json();
};

export const saveProfile = async (data) => {
  const res = await fetch(`${API}/api/profile`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};
