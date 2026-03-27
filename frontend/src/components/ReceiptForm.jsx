import { useState, useEffect } from "react";

const EMPTY_ITEM = {
  description: "",
  quantity: "1",
  unit_price: "",
  total: "",
};

// Nova Scotia Tax Rate (15%)
const TAX_RATE = 0.15;

export default function ReceiptForm({ onSubmit, onClose, initialData, profile }) {
  const [form, setForm] = useState({
    vendor_name: initialData ? "" : (profile?.business_name ?? ""),
    customer_name: "",
    receipt_number: "",
    date: new Date().toISOString().split("T")[0],
    isTaxExempt: false,
    notes: "",
    id: null,
  });

  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [showNotes, setShowNotes] = useState(false);

  // Load existing data if we are editing
  useEffect(() => {
    if (initialData) {
      setForm({
        vendor_name: initialData.vendor_name || "",
        customer_name: initialData.customer_name || "",
        receipt_number: initialData.receipt_number || "",
        date: initialData.date
          ? new Date(initialData.date).toISOString().split("T")[0]
          : "",
        isTaxExempt: parseFloat(initialData.tax) === 0,
        notes: initialData.notes || "",
        id: initialData.id,
      });
      if (initialData.notes) setShowNotes(true);
      if (initialData.line_items?.length) {
        setItems(
          initialData.line_items.map((i) => ({
            ...i,
            quantity: i.quantity.toString(),
            unit_price: i.unit_price.toString(),
            total: i.total.toString(),
          })),
        );
      }
    }
  }, [initialData]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setItem = (i, k, v) => {
    const next = items.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [k]: v };

      if (k === "quantity" || k === "unit_price") {
        // Safely handle empty strings so the field doesn't glitch when clearing
        const qty =
          updated.quantity === "" ? 0 : parseFloat(updated.quantity) || 0;
        const price =
          updated.unit_price === "" ? 0 : parseFloat(updated.unit_price) || 0;
        updated.total = (qty * price).toFixed(2);
      }
      return updated;
    });
    setItems(next);
  };

  const addItem = () => setItems((i) => [...i, { ...EMPTY_ITEM }]);
  const removeItem = (i) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const tax = form.isTaxExempt ? 0 : subtotal * TAX_RATE;
  const total = subtotal + tax;

  const handleSubmit = () => {
    if (!form.vendor_name || !form.customer_name) {
      alert(
        "Missing Information: Please fill in both 'Issued By' and 'Billed To'.",
      );
      return;
    }


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
          <span className="modal-title">
            {form.id ? "Edit Document" : "Create Document"}
          </span>
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
              <label className="field-label">Issued By (Your Business) *</label>
              <input
                className="field"
                placeholder="Business Name"
                value={form.vendor_name}
                onChange={(e) => setField("vendor_name", e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Billed To (Client) *</label>
              <input
                className="field"
                placeholder="Client Name or Company"
                value={form.customer_name}
                onChange={(e) => setField("customer_name", e.target.value)}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-group">
              <label className="field-label">Receipt / Invoice #</label>
              <input
                className="field"
                value={form.receipt_number}
                onChange={(e) => setField("receipt_number", e.target.value)}
                placeholder={form.id ? "" : "Auto — REC-000001"}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Issue Date</label>
              <input
                className="field"
                type="date"
                value={form.date}
                onChange={(e) => setField("date", e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="field-label" style={{ marginBottom: 10 }}>
              Products & Services
            </div>
            <div className="line-item-row header">
              <span>Description</span>
              <span>Qty</span>
              <span>Price</span>
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
                  placeholder="Item or service description"
                  value={item.description}
                  onChange={(e) => setItem(i, "description", e.target.value)}
                />
                <input
                  className="field"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="Qty"
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
                  value={
                    item.total && item.total !== "0.00" ? `$${item.total}` : ""
                  }
                  placeholder="$0.00"
                  style={{
                    color: "var(--text-dim)",
                    backgroundColor: "transparent",
                  }}
                />
                <button className="btn-icon" onClick={() => removeItem(i)}>
                  ✕
                </button>
              </div>
            ))}
            <button
              className="btn btn-ghost"
              style={{ marginTop: 8, fontSize: 10, padding: "8px 12px" }}
              onClick={addItem}
            >
              + Add Line Item
            </button>
          </div>

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
                fontSize: 12,
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
                  fontSize: 10,
                  padding: "6px 10px",
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
                  fontSize: 12,
                }}
              >
                NS Tax ({(TAX_RATE * 100).toFixed(0)}%):{" "}
                <span style={{ fontFamily: "var(--mono)" }}>
                  ${tax.toFixed(2)}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 16,
                fontFamily: "var(--mono)",
                color: "var(--accent)",
                borderTop: "1px solid var(--border)",
                paddingTop: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--text)",
                  alignSelf: "center",
                  fontWeight: 600,
                }}
              >
                Total Amount
              </span>
              <span style={{ fontWeight: 600 }}>${total.toFixed(2)}</span>
            </div>
          </div>

          {showNotes ? (
            <div className="field-group" style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label className="field-label">Note</label>
                <button
                  type="button"
                  className="btn-icon"
                  style={{ fontSize: 11, color: "var(--text-muted)" }}
                  onClick={() => { setShowNotes(false); setField("notes", ""); }}
                >
                  ✕
                </button>
              </div>
              <textarea
                className="field"
                rows={2}
                autoFocus
                style={{ resize: "none" }}
                placeholder="Payment due upon receipt, thank you for your business..."
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: 8, fontSize: 10, padding: "6px 12px" }}
              onClick={() => setShowNotes(true)}
            >
              + Add Note
            </button>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {form.id ? "Save Changes" : "Generate Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
}
