/*
  profile.js — client-side functions for the profile API.

  The profile stores the user's business information:
  business name, address, contact email, phone, bio, website,
  payment URL (for the QR code), and logo URL.

  Usage examples:
    fetchProfile(token)
      → GET /api/profile
      → returns the profile row for the logged-in user, or {} if none exists yet

    saveProfile({ business_name: "Acme", phone: "902-555-0100", ... }, token)
      → PUT /api/profile
      → creates or updates the profile row
      → returns the saved profile object
*/

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function makeHeaders(token) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token ?? ""}`,
  };
}

export const fetchProfile = async (token) => {
  const res = await fetch(`${API_URL}/api/profile`, { headers: makeHeaders(token) });
  return res.json();
};

export const saveProfile = async (data, token) => {
  const res = await fetch(`${API_URL}/api/profile`, {
    method: "PUT",
    headers: makeHeaders(token),
    body: JSON.stringify(data),
  });
  return res.json();
};
