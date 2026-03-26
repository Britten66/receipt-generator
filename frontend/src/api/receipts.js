import { supabase } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL;

const headers = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token ?? ""}`,
  };
};

export const fetchReceipts = async () =>
  fetch(`${API_URL}/api/receipts`, { headers: await headers() }).then((r) => r.json());

export const fetchReceiptById = async (id) =>
  fetch(`${API_URL}/api/receipts/${id}`, { headers: await headers() }).then((r) => r.json());

export const createReceipt = async (data) =>
  fetch(`${API_URL}/api/receipts`, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const updateReceipt = async (id, data) =>
  fetch(`${API_URL}/api/receipts/${id}`, {
    method: "PATCH",
    headers: await headers(),
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const deleteReceipt = async (id) =>
  fetch(`${API_URL}/api/receipts/${id}`, {
    method: "DELETE",
    headers: await headers(),
  }).then((r) => r.json());
