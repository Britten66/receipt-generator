import { useState, useMemo, useEffect, useCallback } from "react";
import { downloadReceiptPDF } from "./components/ReceiptPDF";
import {
  fetchReceipts,
  createReceipt,
  updateReceipt,
  deleteReceipt,
} from "./api/receipts";
import ReceiptForm from "./components/ReceiptForm";
import "./App.css";

const STATUS_CONFIG = {
  draft: { label: "Draft" },
  sent: { label: "Sent" },
  paid: { label: "Paid" },
  voided: { label: "Voided" },
};

const NAV = [
  { key: "ALL", label: "All Receipts" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "paid", label: "Paid" },
  { key: "voided", label: "Voided" },
];

export default function App() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    fetchReceipts()
      .then((d) => setReceipts(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(STATUS_CONFIG).map((s) => [
          s,
          receipts.filter((r) => r.status === s).length,
        ]),
      ),
    [receipts],
  );

  const revenue = receipts
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + parseFloat(r.total || 0), 0);

  const filtered = useMemo(
    () =>
      filter === "ALL" ? receipts : receipts.filter((r) => r.status === filter),
    [receipts, filter],
  );

  const handleCreate = async (data) => {
    try {
      const result = await createReceipt(data);
      if (result?.error) {
        showToast("Failed to save receipt. Check all fields.");
        return;
      }
      if (result?.id) {
        setReceipts((prev) => [result, ...prev]);
        setSelected(result);
        showToast("Receipt created.", "success");
      }
      setShowForm(false);
    } catch (err) {
      showToast("Could not connect to server.");
    }
  };

  const handleStatusChange = async (id, status) => {
    await updateReceipt(id, { status });
    setReceipts((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
    if (selected?.id === id) setSelected((s) => ({ ...s, status }));
  };

  const handleDelete = async (id) => {
    const r = receipts.find((r) => r.id === id);
    if (!window.confirm(`Delete receipt ${r?.receipt_number}?`)) return;
    await deleteReceipt(id);
    setReceipts((prev) => prev.filter((r) => r.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const selectedReceipt = selected
    ? (receipts.find((r) => r.id === selected.id) ?? selected)
    : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-meta">
          {new Date().toLocaleDateString("en-CA", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </header>

      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="stat-block">
            <div className="stat-label">Revenue</div>
            <div className="stat-value">${revenue.toFixed(2)}</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Receipts</div>
            <div className="stat-value">{receipts.length}</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">View</div>
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`sidebar-item${filter === n.key ? " active" : ""}`}
              onClick={() => setFilter(n.key)}
            >
              {n.label}
              <span className="sidebar-count">
                {n.key === "ALL" ? receipts.length : (counts[n.key] ?? 0)}
              </span>
            </button>
          ))}
        </div>

        <div
          style={{
            marginTop: "auto",
            padding: 12,
            borderTop: "1px solid var(--border-light)",
          }}
        >
          <button
            className="btn btn-primary"
            style={{ width: "100%" }}
            onClick={() => setShowForm(true)}
          >
            + New Receipt
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="toolbar">
          <span className="toolbar-title">
            {filter === "ALL" ? "All" : STATUS_CONFIG[filter]?.label} —{" "}
            {filtered.length} receipt{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="content-area">
          <div className="receipt-grid-wrap">
            {loading ? (
              <div className="empty">Loading...</div>
            ) : (
              <div className="receipt-grid">
                {filtered.length === 0 ? (
                  <div className="empty">No receipts found</div>
                ) : (
                  filtered.map((r) => (
                    <div
                      key={r.id}
                      className={`receipt-card${selectedReceipt?.id === r.id ? " selected" : ""}`}
                      onClick={() => setSelected(r)}
                    >
                      <div className="card-num">{r.receipt_number}</div>
                      <div className="card-vendor">{r.vendor_name}</div>
                      <div className="card-customer">{r.customer_name}</div>
                      <div className="card-footer">
                        <span className={`stamp ${r.status}`}>{r.status}</span>
                        <span className="card-total">
                          ${parseFloat(r.total).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedReceipt && (
            <div className="detail-panel">
              <div className="detail-header">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div className="detail-receipt-num">
                      Receipt / {selectedReceipt.receipt_number}
                    </div>
                    <div className="detail-vendor">
                      {selectedReceipt.vendor_name}
                    </div>
                    <div className="detail-customer">
                      Issued to: {selectedReceipt.customer_name}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="btn-icon"
                    style={{ fontSize: 18, marginLeft: 8 }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-row">
                  <span className="detail-key">Status</span>
                  <span className={`stamp ${selectedReceipt.status}`}>
                    {selectedReceipt.status}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Date</span>
                  <span className="detail-val">
                    {selectedReceipt.date
                      ? new Date(selectedReceipt.date).toLocaleDateString(
                          "en-CA",
                        )
                      : "—"}
                  </span>
                </div>
                {selectedReceipt.notes && (
                  <div
                    className="detail-row"
                    style={{ alignItems: "flex-start", gap: 12, marginTop: 4 }}
                  >
                    <span className="detail-key">Notes</span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-dim)",
                        textAlign: "right",
                        maxWidth: 180,
                      }}
                    >
                      {selectedReceipt.notes}
                    </span>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <table className="line-items-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style={{ textAlign: "right" }}>Qty</th>
                      <th style={{ textAlign: "right" }}>Unit</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReceipt.line_items?.length ? (
                      selectedReceipt.line_items.map((li) => (
                        <tr key={li.id}>
                          <td>{li.description}</td>
                          <td className="number">{li.quantity}</td>
                          <td className="number">
                            ${parseFloat(li.unit_price).toFixed(2)}
                          </td>
                          <td className="number">
                            ${parseFloat(li.total).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            color: "var(--text-muted)",
                            paddingTop: 10,
                            fontSize: 9,
                            letterSpacing: "0.15em",
                          }}
                        >
                          No line items
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div style={{ marginTop: 12 }}>
                  <div className="total-line">
                    <span className="tl-label">Subtotal</span>
                    <span className="tl-val">
                      ${parseFloat(selectedReceipt.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="total-line">
                    <span className="tl-label">Tax</span>
                    <span className="tl-val">
                      ${parseFloat(selectedReceipt.tax || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="total-line grand">
                    <span className="tl-label">Total</span>
                    <span className="tl-val">
                      ${parseFloat(selectedReceipt.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <div className="stat-label" style={{ marginBottom: 8 }}>
                  Update Status
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {Object.keys(STATUS_CONFIG)
                    .filter((s) => s !== selectedReceipt.status)
                    .map((s) => (
                      <button
                        key={s}
                        className="btn btn-status"
                        onClick={() =>
                          handleStatusChange(selectedReceipt.id, s)
                        }
                      >
                        → {s}
                      </button>
                    ))}
                </div>
              </div>

              <div className="detail-section" style={{ marginTop: "auto" }}>
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", marginBottom: 6 }}
                  onClick={() => downloadReceiptPDF(selectedReceipt)}
                >
                  ↓ Download PDF
                </button>
                <button
                  className="btn btn-danger"
                  style={{ width: "100%" }}
                  onClick={() => handleDelete(selectedReceipt.id)}
                >
                  Delete Receipt
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <ReceiptForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background:
              toast.type === "success" ? "var(--paid)" : "var(--voided)",
            color: "#fff",
            padding: "10px 20px",
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontFamily: "var(--mono)",
            zIndex: 500,
            border: "1px solid rgba(0,0,0,0.2)",
            boxShadow: "2px 2px 0 rgba(0,0,0,0.15)",
            whiteSpace: "nowrap",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
