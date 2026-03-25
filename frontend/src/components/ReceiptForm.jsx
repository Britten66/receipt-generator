import { useState } from "react";

const EMPTY_ITEM = {
  description: "",
  quantity: "1",
  unit_price: "",
  total: "",
};

// Set your default tax rate here (0.10 = 10%)
const TAX_RATE = 0.1;

export default function ReceiptForm({ onSubmit, onClose }) {
  const [form, setForm] = useState({
    vendor_name: "",
    customer_name: "",
    receipt_number: `REC-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split("T")[0],
    isTaxExempt: false,
    notes: "",
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setItem = (i, k, v) => {
    const next = items.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [k]: v };
      if (k === "quantity" || k === "unit_price") {
        const qty = parseFloat(k === "quantity" ? v : updated.quantity) || 0;
        const price =
          parseFloat(k === "unit_price" ? v : updated.unit_price) || 0;
        updated.total = (qty * price).toFixed(2);
      }
      return updated;
    });
    setItems(next);
  };

  const addItem = () => setItems((i) => [...i, { ...EMPTY_ITEM }]);
  const removeItem = (i) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  // Auto-Calculating Totals
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const tax = form.isTaxExempt ? 0 : subtotal * TAX_RATE;
  const total = subtotal + tax;

  const handleSubmit = () => {
    if (!form.vendor_name || !form.customer_name) return;
    onSubmit({
      ...form,
      subtotal,
      tax,
      total,
      line_items: items
        .filter((i) => i.description)
        .map((i) => ({
          description: i.description,
          quantity: parseFloat(i.quantity) || 0,
          unit_price: parseFloat(i.unit_price) || 0,
          total: parseFloat(i.total) || 0,
        })),
    });
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New Receipt</span>
          <button
            className="btn btn-ghost"
            style={{ padding: "4px 10px" }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="field-row">
            <div className="field-group">
              <label className="field-label">Vendor Name *</label>
              <input
                className="field"
                placeholder="Your business"
                value={form.vendor_name}
                onChange={(e) => setField("vendor_name", e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Customer Name *</label>
              <input
                className="field"
                placeholder="Client name"
                value={form.customer_name}
                onChange={(e) => setField("customer_name", e.target.value)}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-group">
              <label className="field-label">Receipt Number</label>
              <input
                className="field"
                value={form.receipt_number}
                onChange={(e) => setField("receipt_number", e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Date</label>
              <input
                className="field"
                type="date"
                value={form.date}
                onChange={(e) => setField("date", e.target.value)}
              />
            </div>
          </div>

          {/* LINE ITEMS */}
          <div>
            <div className="field-label" style={{ marginBottom: 10 }}>
              Line Items
            </div>
            <div className="line-item-row header">
              <span>Description</span>
              <span>Qty</span>
              <span>Unit Price</span>
              <span>Total</span>
              <span></span>
            </div>
            {items.map((item, i) => (
              <div
                key={i}
                className="line-item-row"
                style={{ marginBottom: 6 }}
              >
                <input
                  className="field"
                  placeholder="Item description"
                  value={item.description}
                  onChange={(e) => setItem(i, "description", e.target.value)}
                />
                <input
                  className="field"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="1"
                  value={item.quantity}
                  onChange={(e) => setItem(i, "quantity", e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
                <input
                  className="field"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={item.unit_price}
                  onChange={(e) => setItem(i, "unit_price", e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
                <input
                  className="field"
                  readOnly
                  value={item.total ? `$${item.total}` : ""}
                  style={{ color: "var(--text-dim)" }}
                />
                <button className="btn-icon" onClick={() => removeItem(i)}>
                  ×
                </button>
              </div>
            ))}
            <button
              className="btn btn-ghost"
              style={{ marginTop: 8, fontSize: 9, padding: "6px 12px" }}
              onClick={addItem}
            >
              + Add Item
            </button>
          </div>

          {/* TOTALS */}
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 16,
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--text-dim)",
              }}
            >
              <span>Subtotal</span>
              <span style={{ fontFamily: "var(--mono)" }}>
                ${subtotal.toFixed(2)}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                className={`btn ${form.isTaxExempt ? "btn-status" : "btn-ghost"}`}
                onClick={() => setField("isTaxExempt", !form.isTaxExempt)}
                style={{
                  fontSize: 9,
                  padding: "4px 8px",
                  color: form.isTaxExempt
                    ? "var(--voided)"
                    : "var(--text-muted)",
                }}
              >
                {form.isTaxExempt ? "✓ TAX EXEMPT" : "MAKE TAX EXEMPT"}
              </button>
              <div
                style={{
                  textAlign: "right",
                  color: "var(--text-dim)",
                  fontSize: 11,
                }}
              >
                Tax ({(TAX_RATE * 100).toFixed(0)}%):{" "}
                <span style={{ fontFamily: "var(--mono)" }}>
                  ${tax.toFixed(2)}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                fontFamily: "var(--mono)",
                color: "var(--accent)",
                borderTop: "1px solid var(--border)",
                paddingTop: 10,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--text)",
                  alignSelf: "center",
                }}
              >
                Total
              </span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="field-group" style={{ marginTop: 8 }}>
            <label className="field-label">Notes</label>
            <textarea
              className="field"
              rows={2}
              style={{ resize: "none" }}
              placeholder="Payment terms, reference numbers..."
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Issue Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
