import { supabase } from "../lib/supabase";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function headers() {
  let { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    try {
      const { exp } = JSON.parse(atob(session.access_token.split(".")[1]));
      if (exp * 1000 <= Date.now()) {
        const { data } = await supabase.auth.refreshSession();
        session = data.session;
      }
    } catch {}
  }
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

export const fetchDeletedReceipts = async () =>
  fetch(`${BASE}/receipts?trash=1`, { headers: await headers() }).then(r => r.json());

export const restoreReceipt = async (id) =>
  fetch(`${BASE}/receipts?id=${id}&restore=1`, {
    method: "PATCH",
    headers: await headers(),
  }).then(r => r.json());

export const purgeReceipt = async (id) =>
  fetch(`${BASE}/receipts?id=${id}&purge=1`, {
    method: "DELETE",
    headers: await headers(),
  }).then(r => r.json());
