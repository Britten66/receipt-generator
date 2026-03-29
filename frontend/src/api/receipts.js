/*
  receipts.js — client-side functions for talking to the receipts API.

  Each function sends an HTTP request to one of the Vercel serverless functions
  in frontend/api/receipts/ and returns the JSON response.

  All requests include the user's JWT token in the Authorization header.
  The server uses this token to verify the user and scope the query to their data.

  Usage examples:
    fetchReceipts(token)
      → GET /api/receipts
      → returns array of all receipts for the logged-in user

    fetchReceiptById("abc-123", token)
      → GET /api/receipts/abc-123
      → returns one receipt with its line_items array included

    createReceipt({ vendor_name: "Acme", customer_name: "Bob", ... }, token)
      → POST /api/receipts
      → returns the newly created receipt object

    updateReceipt("abc-123", { status: "paid" }, token)
      → PATCH /api/receipts/abc-123
      → returns the updated receipt object

    deleteReceipt("abc-123", token)
      → DELETE /api/receipts/abc-123
      → returns { message: "Deleted" }
*/

const API_URL = import.meta.env.VITE_API_URL;

/*
  makeHeaders(token) — returns the standard request headers.
  Every API call needs Content-Type and Authorization.
  The token is the JWT from the Supabase session.
*/
function makeHeaders(token) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token ?? ""}`,
  };
}

export const fetchReceipts = async (token) =>
  fetch(`${API_URL}/api/receipts`, { headers: makeHeaders(token) }).then((r) => r.json());

export const fetchReceiptById = async (id, token) =>
  fetch(`${API_URL}/api/receipts/${id}`, { headers: makeHeaders(token) }).then((r) => r.json());

export const createReceipt = async (data, token) =>
  fetch(`${API_URL}/api/receipts`, {
    method: "POST",
    headers: makeHeaders(token),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const updateReceipt = async (id, data, token) =>
  fetch(`${API_URL}/api/receipts/${id}`, {
    method: "PATCH",
    headers: makeHeaders(token),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const deleteReceipt = async (id, token) =>
  fetch(`${API_URL}/api/receipts/${id}`, {
    method: "DELETE",
    headers: makeHeaders(token),
  }).then((r) => r.json());
