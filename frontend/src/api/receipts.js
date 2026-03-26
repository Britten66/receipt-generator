const API_URL = import.meta.env.VITE_API_URL;

const h = (token) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token ?? ""}`,
});

export const fetchReceipts = async (token) =>
  fetch(`${API_URL}/api/receipts`, { headers: h(token) }).then((r) => r.json());

export const fetchReceiptById = async (id, token) =>
  fetch(`${API_URL}/api/receipts/${id}`, { headers: h(token) }).then((r) => r.json());

export const createReceipt = async (data, token) =>
  fetch(`${API_URL}/api/receipts`, {
    method: "POST",
    headers: h(token),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const updateReceipt = async (id, data, token) =>
  fetch(`${API_URL}/api/receipts/${id}`, {
    method: "PATCH",
    headers: h(token),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const deleteReceipt = async (id, token) =>
  fetch(`${API_URL}/api/receipts/${id}`, {
    method: "DELETE",
    headers: h(token),
  }).then((r) => r.json());
