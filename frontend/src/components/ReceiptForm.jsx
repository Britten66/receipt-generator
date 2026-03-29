/*
  ReceiptForm.jsx — the modal form for creating or editing a receipt.

  Props:
    onSubmit(data)  — called when the user clicks Generate/Save. data is the full receipt object.
    onClose()       — called when the user clicks Cancel or the backdrop.
    initialData     — if editing an existing receipt, this is the receipt object to pre-fill.
                      if creating a new receipt, this is null/undefined.
    profile         — the user's profile, used to pre-fill the "Issued By" business name field.

  The form manages two pieces of state:
    form  — the top-level fields (vendor name, client name, date, etc.)
    items — the array of line items (description, qty, unit price, total per line)
*/

import { useState, useEffect } from "react";

/*
  EMPTY_ITEM is the default shape of a new blank line item.
  quantity starts at "1" so the user can just type in the price.
  We store numbers as strings in state because HTML inputs are strings.
  They get converted to numbers in handleSubmit before being sent to the server.
*/
const EMPTY_ITEM = {
  description: "",
  quantity: "1",
  unit_price: "",
  total: "",
};

/*
  Nova Scotia HST rate.
  To change the tax rate for a different province, update this number.
  0.15 = 15%
*/
const TAX_RATE = 0.15;

export default function ReceiptForm({ onSubmit, onClose, initialData, profile }) {

  /*
    form — the main fields of the receipt.

    When creating a new receipt (initialData is null):
      - vendor_name pre-fills from the user's saved profile business name
      - date defaults to today
      - id is null (the server will generate an id on creation)

    When editing an existing receipt (initialData is the receipt object):
      - vendor_name starts blank and gets filled in by the useEffect below
      - id is the existing receipt's id so the server knows to UPDATE not INSERT
  */
  const [form, setForm] = useState(() => {
    // Figure out the initial vendor name
    // If editing, leave it blank — useEffect will fill it in from initialData
    // If creating new, use the saved business name from the profile (or blank)
    let startingVendorName = "";
    if (!initialData && profile && profile.business_name) {
      startingVendorName = profile.business_name;
    }

    return {
      vendor_name: startingVendorName,
      customer_name: "",
      receipt_number: "",
      date: new Date().toISOString().split("T")[0], // today in YYYY-MM-DD format
      isTaxExempt: false,
      notes: "",
      id: null,
    };
  });

  // The list of line items. Starts with one blank row.
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  // Controls whether the notes textarea is visible. Hidden by default, shown when "+ Add Note" is clicked.
  const [showNotes, setShowNotes] = useState(false);

  /*
    When editing an existing receipt, load its data into the form.
    This runs once when the component mounts (because initialData is in the dependency array).
    It does nothing when creating a new receipt.
  */
  useEffect(() => {
    if (!initialData) return;

    // Parse isTaxExempt from whether tax is 0 on the saved receipt
    // If tax === 0, the receipt was saved as tax exempt
    const wasTaxExempt = parseFloat(initialData.tax) === 0;

    // Format the date as YYYY-MM-DD for the date input field
    // The date comes from the server as a full ISO string like "2025-03-01T00:00:00Z"
    let formattedDate = "";
    if (initialData.date) {
      formattedDate = new Date(initialData.date).toISOString().split("T")[0];
    }

    setForm({
      vendor_name: initialData.vendor_name || "",
      customer_name: initialData.customer_name || "",
      receipt_number: initialData.receipt_number || "",
      date: formattedDate,
      isTaxExempt: wasTaxExempt,
      notes: initialData.notes || "",
      id: initialData.id,
    });

    // Show the notes box if the receipt already has notes
    if (initialData.notes) {
      setShowNotes(true);
    }

    // Load existing line items if the receipt has any
    // We convert numbers back to strings because the input fields work with strings
    if (initialData.line_items && initialData.line_items.length > 0) {
      const loadedItems = initialData.line_items.map((item) => ({
        ...item,
        quantity:   item.quantity.toString(),
        unit_price: item.unit_price.toString(),
        total:      item.total.toString(),
      }));
      setItems(loadedItems);
    }
  }, [initialData]);

  /*
    setField(key, value) — update a single field in the form state.
    For example: setField("customer_name", "Bob Smith")

    The spread ...f copies all existing fields and then overwrites just the one we want.
    This is the standard React pattern for updating a single key in an object state.
  */
  function setField(key, value) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  /*
    setItem(index, key, value) — update a single field on a single line item.

    Arguments:
      index — which line item to update (0 = first row, 1 = second row, etc.)
      key   — which field to update ("description", "quantity", or "unit_price")
      value — the new value typed by the user

    When quantity or unit_price changes, we also recalculate the row total automatically.
    Empty strings are treated as 0 so the field doesn't glitch when the user clears it.
  */
  function setItem(index, key, value) {
    const updatedItems = items.map((item, i) => {
      // Leave all rows except the one being edited exactly as they are
      if (i !== index) return item;

      // Create a copy of this row with the new value
      const updatedRow = { ...item, [key]: value };

      // If quantity or price changed, recalculate the row total
      if (key === "quantity" || key === "unit_price") {
        // Parse the values — treat empty string as 0
        let qty = 0;
        if (updatedRow.quantity !== "") {
          qty = parseFloat(updatedRow.quantity) || 0;
        }

        let price = 0;
        if (updatedRow.unit_price !== "") {
          price = parseFloat(updatedRow.unit_price) || 0;
        }

        // toFixed(2) gives us exactly two decimal places e.g. "25.00"
        updatedRow.total = (qty * price).toFixed(2);
      }

      return updatedRow;
    });

    setItems(updatedItems);
  }

  // Add a new blank line item row to the bottom of the list
  function addItem() {
    setItems((currentItems) => [...currentItems, { ...EMPTY_ITEM }]);
  }

  // Remove a line item row by its index
  function removeItem(index) {
    setItems((currentItems) => currentItems.filter((_, i) => i !== index));
  }

  /*
    Calculate the running totals shown at the bottom of the form.

    subtotal — sum of all line item totals (before tax)
    tax      — 15% of subtotal, or 0 if the receipt is marked tax exempt
    total    — subtotal + tax
  */
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

  let tax;
  if (form.isTaxExempt) {
    tax = 0;
  } else {
    tax = subtotal * TAX_RATE;
  }

  const total = subtotal + tax;

  /*
    handleSubmit() — called when the user clicks "Generate Receipt" or "Save Changes".

    Validates required fields, then calls onSubmit() with the full receipt data.
    Line items are filtered to remove any rows where description is blank
    (the user may have added a row but not filled it in).
    All number strings are converted to actual numbers before sending.
  */
  function handleSubmit() {
    if (!form.vendor_name || !form.customer_name) {
      alert("Missing Information: Please fill in both 'Issued By' and 'Billed To'.");
      return;
    }

    // Filter out empty rows and convert strings to numbers
    const cleanedItems = items
      .filter((item) => item.description) // skip rows with no description
      .map((item) => ({
        description: item.description,
        quantity:    parseFloat(item.quantity)   || 0,
        unit_price:  parseFloat(item.unit_price) || 0,
        total:       parseFloat(item.total)      || 0,
      }));

    onSubmit({
      ...form,
      subtotal,
      tax,
      total,
      line_items: cleanedItems,
    });
  }

  /*
    Determine the title and submit button label based on whether we're
    creating a new receipt or editing an existing one.
    form.id is null for new receipts, and the receipt's UUID when editing.
  */
  let modalTitle;
  let submitButtonLabel;
  if (form.id) {
    modalTitle = "Edit Document";
    submitButtonLabel = "Save Changes";
  } else {
    modalTitle = "Create Document";
    submitButtonLabel = "Generate Receipt";
  }

  /*
    Placeholder for the receipt number field.
    When editing, the field already has a value so no placeholder is needed.
    When creating, we show "Auto — REC-000001" to explain that the server
    will generate the number automatically if left blank.
  */
  let receiptNumberPlaceholder;
  if (form.id) {
    receiptNumberPlaceholder = "";
  } else {
    receiptNumberPlaceholder = "Auto — REC-000001";
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        // Close the modal if the user clicks the dark backdrop behind it
        // e.target is what was clicked, e.currentTarget is the backdrop div itself
        // If they're the same element, the user clicked outside the modal
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{modalTitle}</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* Top row: Issued By (your business) and Billed To (the client) */}
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

          {/* Second row: Receipt number and issue date */}
          <div className="field-row">
            <div className="field-group">
              <label className="field-label">Receipt / Invoice #</label>
              <input
                className="field"
                value={form.receipt_number}
                onChange={(e) => setField("receipt_number", e.target.value)}
                placeholder={receiptNumberPlaceholder}
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

          {/* Line items — each row is one product or service */}
          <div>
            <div className="field-label" style={{ marginBottom: 10 }}>Products &amp; Services</div>
            <div className="line-item-row header">
              <span>Description</span>
              <span>Qty</span>
              <span>Price</span>
              <span>Total</span>
              <span></span>
            </div>
            {items.map((item, i) => (
              <div key={i} className="line-item-row" style={{ marginBottom: 6 }}>
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
                  onFocus={(e) => e.target.select()} // select all text when focused so it's easy to replace
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
                {/* Row total is read-only — it's calculated automatically from qty × price */}
                <input
                  className="field"
                  readOnly
                  value={item.total && item.total !== "0.00" ? `$${item.total}` : ""}
                  placeholder="$0.00"
                  style={{ color: "var(--text-dim)", backgroundColor: "transparent" }}
                />
                <button className="btn-icon" onClick={() => removeItem(i)}>✕</button>
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

          {/* Totals section: subtotal, tax toggle, grand total */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "grid", gap: 12 }}>

            {/* Subtotal — sum of all line item totals before tax */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-dim)" }}>
              <span>Subtotal</span>
              <span style={{ fontFamily: "var(--mono)" }}>${subtotal.toFixed(2)}</span>
            </div>

            {/* Tax row — includes a toggle button to mark the receipt as tax exempt */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                className={`btn ${form.isTaxExempt ? "btn-status" : "btn-ghost"}`}
                onClick={() => setField("isTaxExempt", !form.isTaxExempt)}
                style={{ fontSize: 10, padding: "6px 10px", color: form.isTaxExempt ? "var(--voided)" : "var(--text-muted)" }}
              >
                {form.isTaxExempt ? "✓ TAX EXEMPT" : "MAKE TAX EXEMPT"}
              </button>
              <div style={{ textAlign: "right", color: "var(--text-dim)", fontSize: 12 }}>
                NS Tax ({(TAX_RATE * 100).toFixed(0)}%):{" "}
                <span style={{ fontFamily: "var(--mono)" }}>${tax.toFixed(2)}</span>
              </div>
            </div>

            {/* Grand total */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontFamily: "var(--mono)", color: "var(--accent)", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text)", alignSelf: "center", fontWeight: 600 }}>
                Total Amount
              </span>
              <span style={{ fontWeight: 600 }}>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes section — hidden until the user clicks "+ Add Note" */}
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
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>{submitButtonLabel}</button>
        </div>
      </div>
    </div>
  );
}
