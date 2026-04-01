import { supabase } from "../lib/supabase";

export const fetchReceipts = () =>
  supabase.functions.invoke("receipts", { method: "GET" }).then(({ data }) => data ?? []);

export const fetchReceiptById = (id) =>
  supabase.functions.invoke("receipts", {
    method: "GET",
    headers: { "x-receipt-id": id },
  }).then(({ data }) => data);

export const createReceipt = (data) =>
  supabase.functions.invoke("receipts", {
    method: "POST",
    body: data,
  }).then(({ data: result }) => result);

export const updateReceipt = (id, data) =>
  supabase.functions.invoke("receipts", {
    method: "PATCH",
    body: { id, ...data },
  }).then(({ data: result }) => result);

export const deleteReceipt = (id) =>
  supabase.functions.invoke("receipts", {
    method: "DELETE",
    body: { id },
  }).then(({ data: result }) => result);
