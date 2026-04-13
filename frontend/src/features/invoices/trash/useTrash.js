import { useState, useCallback } from "react";
import { fetchDeletedReceipts, restoreReceipt, purgeReceipt } from "../../../api/receipts";

export function useTrash({ showToast, onRestored }) {
  const [deleted, setDeleted]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [working, setWorking]   = useState(null); // id of invoice being restored/purged

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDeletedReceipts();
      setDeleted(Array.isArray(data) ? data : []);
    } catch {
      setDeleted([]);
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleRestore(id) {
    setWorking(id);
    try {
      await restoreReceipt(id);
      setDeleted((prev) => prev.filter((r) => r.id !== id));
      onRestored();
      showToast("Invoice restored.", "success");
    } catch {
      showToast("Could not restore. Try again.", "error");
    }
    setWorking(null);
  }

  async function handlePurge(id, receiptNumber) {
    if (!window.confirm(`Permanently delete ${receiptNumber ?? id}? This cannot be undone.`)) return;
    setWorking(id);
    try {
      await purgeReceipt(id);
      setDeleted((prev) => prev.filter((r) => r.id !== id));
      showToast("Invoice permanently deleted.", "success");
    } catch {
      showToast("Could not delete. Try again.", "error");
    }
    setWorking(null);
  }

  return { deleted, loading, working, load, handleRestore, handlePurge };
}
