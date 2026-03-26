const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const h = (token) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token ?? ""}`,
});

export const fetchProfile = async (token) => {
  const res = await fetch(`${API}/api/profile`, { headers: h(token) });
  return res.json();
};

export const saveProfile = async (data, token) => {
  const res = await fetch(`${API}/api/profile`, {
    method: "PUT",
    headers: h(token),
    body: JSON.stringify(data),
  });
  return res.json();
};
