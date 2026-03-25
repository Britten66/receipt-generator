import { useState, useMemo, useEffect } from "react";
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
  draft: { label: "Draft", color: "var(--draft)" },
  sent: { label: "Sent", color: "var(--sent)" },
  paid: { label: "Paid", color: "var(--paid)" },
  voided: { label: "Voided", color: "var(--voided)" },
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
    const result = await createReceipt(data);
    if (result?.id) {
      setReceipts((prev) => [result, ...prev]);
      setSelected(result);
    }
    setShowForm(false);
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
        <div className="wordmark">
          Receipt <span>Generator</span>
        </div>
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
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value accent">${revenue.toFixed(2)}</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Total Receipts</div>
            <div className="stat-value">{receipts.length}</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Filter</div>
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

        <div className="sidebar-section" style={{ marginTop: "auto" }}>
          <div style={{ padding: "12px 16px" }}>
            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => setShowForm(true)}
            >
              + New Receipt
            </button>
          </div>
        </div>
      </aside>

      <main className="main" style={{ display: "flex", overflow: "hidden" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div className="toolbar">
            <span className="toolbar-title">
              {filter === "ALL" ? "All Receipts" : STATUS_CONFIG[filter]?.label}{" "}
              — {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="ledger">
            <div className="ledger-head">
              {[
                "Receipt #",
                "Vendor",
                "Customer",
                "Status",
                "Total",
                "Date",
                "",
              ].map((h) => (
                <div key={h} className="ledger-head-cell">
                  {h}
                </div>
              ))}
            </div>

            {loading ? (
              <div className="empty">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="empty">No receipts found</div>
            ) : (
              filtered.map((r) => (
                <div
                  key={r.id}
                  className={`ledger-row${selectedReceipt?.id === r.id ? " selected" : ""}`}
                  onClick={() => setSelected(r)}
                >
                  <div
                    className="ledger-cell mono"
                    style={{ color: "var(--accent)", fontSize: 10 }}
                  >
                    {r.receipt_number}
                  </div>
                  <div className="ledger-cell">{r.vendor_name}</div>
                  <div className="ledger-cell dim">{r.customer_name}</div>
                  <div className="ledger-cell">
                    <span className={`stamp ${r.status}`}>{r.status}</span>
                  </div>
                  <div className="ledger-cell number">
                    ${parseFloat(r.total).toFixed(2)}
                  </div>
                  <div className="ledger-cell dim" style={{ fontSize: 10 }}>
                    {r.date
                      ? new Date(r.date).toLocaleDateString("en-CA")
                      : "—"}
                  </div>
                  <div className="ledger-cell">
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(r.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
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
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    fontSize: 18,
                    lineHeight: 1,
                    padding: 0,
                    flexShrink: 0,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-muted)")
                  }
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
                    ? new Date(selectedReceipt.date).toLocaleDateString("en-CA")
                    : "—"}
                </span>
              </div>
              {selectedReceipt.notes && (
                <div
                  className="detail-row"
                  style={{ alignItems: "flex-start", gap: 16 }}
                >
                  <span className="detail-key">Notes</span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      textAlign: "right",
                      maxWidth: 200,
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
                          fontSize: 9,
                          letterSpacing: "0.15em",
                          paddingTop: 12,
                        }}
                      >
                        No line items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div style={{ marginTop: 16 }}>
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
              <div className="stat-label" style={{ marginBottom: 10 }}>
                Update Status
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.keys(STATUS_CONFIG)
                  .filter((s) => s !== selectedReceipt.status)
                  .map((s) => (
                    <button
                      key={s}
                      className="btn btn-status"
                      onClick={() => handleStatusChange(selectedReceipt.id, s)}
                    >
                      → {s}
                    </button>
                  ))}
              </div>
            </div>

            <div className="detail-section" style={{ marginTop: "auto" }}>
              <button
                className="btn btn-primary"
                style={{ width: "100%", marginBottom: 8 }}
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
      </main>

      {showForm && (
        <ReceiptForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
