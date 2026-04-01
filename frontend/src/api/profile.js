const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

function headers(token) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token ?? ""}`,
    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export const fetchProfile = (token) =>
  fetch(`${BASE}/profile`, { headers: headers(token) }).then((r) => r.json());

export const saveProfile = (data, token) =>
  fetch(`${BASE}/profile`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(data),
  }).then((r) => r.json());
