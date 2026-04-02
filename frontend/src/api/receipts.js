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

export const fetchReceipts = async () =>
  fetch(`${BASE}/receipts`, { headers: await headers() }).then(r => r.json());

export const fetchReceiptById = async (id) =>
  fetch(`${BASE}/receipts?id=${id}`, { headers: await headers() }).then(r => r.json());

export const createReceipt = async (data) =>
  fetch(`${BASE}/receipts`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify(data),
  }).then(r => r.json());

export const updateReceipt = async (id, data) =>
  fetch(`${BASE}/receipts?id=${id}`, {
    method: "PATCH",
    headers: await headers(),
    body: JSON.stringify(data),
  }).then(r => r.json());

export const deleteReceipt = async (id) =>
  fetch(`${BASE}/receipts?id=${id}`, {
    method: "DELETE",
    headers: await headers(),
  }).then(r => r.json());
