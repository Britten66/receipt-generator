const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

function headers(token) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token ?? ""}`,
  };
}

export const fetchReceipts = (token) =>
  fetch(`${BASE}/receipts`, { headers: headers(token) }).then((r) => r.json());

export const fetchReceiptById = (id, token) =>
  fetch(`${BASE}/receipts?id=${id}`, { headers: headers(token) }).then((r) => r.json());

export const createReceipt = (data, token) =>
  fetch(`${BASE}/receipts`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const updateReceipt = (id, data, token) =>
  fetch(`${BASE}/receipts?id=${id}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const deleteReceipt = (id, token) =>
  fetch(`${BASE}/receipts?id=${id}`, {
    method: "DELETE",
    headers: headers(token),
  }).then((r) => r.json());
