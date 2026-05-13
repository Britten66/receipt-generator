import { useState, useMemo } from "react";
import { fetchReceipts, fetchReceiptById, createReceipt, updateReceipt, deleteReceipt } from "../../api/receipts";
import { STATUS_CONFIG, STATUS_LABELS } from "../../lib/constants";
import posthog from "posthog-js";

export function useInvoices({ session, profile, showToast }) {
  const [receipts, setReceipts]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState("ALL");
  const [selected, setSelected]           = useState(null);
  const [showForm, setShowForm]           = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);

  async function loadReceipts() {
    setLoading(true);
    fetchReceipts()
      .then((data) => setReceipts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  async function handleSaveReceipt(data) {
    try {
      if (data.id) {
        const result = await updateReceipt(data.id, data);
        if (result?.error) throw new Error(result.error);
        const updated = { ...result, line_items: data.line_items ?? [], unit_label: data.unit_label || result.unit_label || "Qty" };
        setReceipts((prev) => prev.map((r) => (r.id === data.id ? updated : r)));
        setSelected(updated);
        showToast("Invoice updated.", "success");
      } else {
        const result = await createReceipt(data);
        if (result?.error) throw new Error(result.error);
        const created = { ...result, unit_label: data.unit_label || result.unit_label || "Qty" };
        setReceipts((prev) => [created, ...prev]);
        posthog.capture("invoice_created", {
          invoice_count: receipts.length + 1,
          has_line_items: (data.line_items?.length ?? 0) > 0,
          currency: data.currency || "CAD",
        });
        showToast("Invoice created.", "success");
      }
      setShowForm(false);
      setEditingReceipt(null);
    } catch (err) {
      showToast(err.message || "Failed to save. Check all fields.");
    }
  }

  async function handleStatusChange(id, status) {
    await updateReceipt(id, { status });
    setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (selected && selected.id === id) setSelected((s) => ({ ...s, status }));
    showToast(STATUS_LABELS[status] || "Status updated", "success");
    if (status === "paid") {
      posthog.capture("invoice_marked_paid", {
        tier: profile?.tier ?? "free",
        total_paid_count: receipts.filter((r) => r.status === "paid").length + 1,
      });
    }
  }

  async function handleDelete(id) {
    const rec = receipts.find((r) => r.id === id);
    if (!window.confirm(`Delete invoice ${rec?.receipt_number ?? id}?`)) return;
    try {
      await deleteReceipt(id);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      if (selected && selected.id === id) setSelected(null);
    } catch {
      showToast("Delete failed. Please try again.", "error");
    }
  }

  async function selectFull(id) {
    const cached = receipts.find((r) => r.id === id);
    if (cached?.line_items) { setSelected(cached); return; }
    if (cached) setSelected(cached);
    const full = await fetchReceiptById(id);
    if (full?.error) return;
    setSelected(full);
    setReceipts((prev) => prev.map((r) => (r.id === id ? full : r)));
  }

  function openNewReceipt() { setEditingReceipt(null); setShowForm(true); }

  async function handleDismissForm(formData) {
    setShowForm(false);
    setEditingReceipt(null);

    // Only auto-save new invoices — editing an existing one on dismiss stays discarded
    if (formData?.id) return;

    const hasData = formData?.customer_name?.trim() ||
      formData?.line_items?.some((i) => i.description?.trim());
    if (!hasData) return;

    const cleanedItems = (formData.line_items ?? [])
      .filter((i) => i.description?.trim())
      .map((i) => ({
        description: i.description,
        quantity:    parseFloat(i.quantity)   || 0,
        unit_price:  parseFloat(i.unit_price) || 0,
        total:       parseFloat(i.total)      || 0,
      }));

    try {
      const result = await createReceipt({ ...formData, line_items: cleanedItems, status: "draft" });
      if (result?.error) throw new Error(result.error);
      setReceipts((prev) => [result, ...prev]);
      showToast("Saved as draft.", "success");
    } catch {
      // Silent — don't block the user from leaving
    }
  }

  async function openEditReceipt(receipt) {
    if (!receipt.line_items) {
      const full = await fetchReceiptById(receipt.id);
      setEditingReceipt(full?.error ? receipt : full);
    } else {
      setEditingReceipt(receipt);
    }
    setShowForm(true);
  }

  // Derived values
  const counts = useMemo(() => {
    const result = {};
    for (const status of Object.keys(STATUS_CONFIG)) {
      result[status] = receipts.filter((r) => r.status === status).length;
    }
    return result;
  }, [receipts]);

  const revenue = receipts
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + parseFloat(r.subtotal || 0), 0);

  const outstanding = receipts
    .filter((r) => r.status === "sent")
    .reduce((sum, r) => sum + parseFloat(r.total || 0), 0);

  const filtered = useMemo(() => {
    if (filter === "ALL") return receipts;
    return receipts.filter((r) => r.status === filter);
  }, [receipts, filter]);

  let selectedReceipt = null;
  if (selected) {
    const live = receipts.find((r) => r.id === selected.id);
    selectedReceipt = { ...selected, status: live ? live.status : selected.status };
  }

  return {
    receipts, loading, filter, setFilter,
    selected, setSelected, selectedReceipt,
    showForm, setShowForm,
    editingReceipt, setEditingReceipt,
    loadReceipts,
    handleSaveReceipt, handleDismissForm, handleStatusChange, handleDelete,
    selectFull, openNewReceipt, openEditReceipt,
    counts, revenue, outstanding, filtered,
  };
}
