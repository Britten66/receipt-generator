/*
  ReceiptList.jsx — renders the list of receipts in the main dashboard.

  Props:
    receipts      — array of receipt objects from the database
    STATUS_CONFIG — object mapping status keys to display settings
                    Example: { draft: { color: "#aaa", label: "Draft" }, paid: { color: "#5a5", label: "Paid" }, ... }
    onDelete(id)  — called when the user clicks the ✕ delete button on a row

  Each row shows:
    receipt number, vendor name, customer name, status badge, total amount, date, delete button

  If there are no receipts, a placeholder message is shown instead of the list.
*/

export default function ReceiptList({ receipts, STATUS_CONFIG, onDelete }) {

  // If the receipts array is empty, show a placeholder message instead of the table
  if (!receipts.length) {
    return (
      <div
        style={{
          padding: "48px 20px",
          textAlign: "center",
          fontSize: 9,
          letterSpacing: "0.2em",
          color: "rgba(232,226,217,0.1)",
        }}
      >
        NO RECEIPTS FOUND
      </div>
    );
  }

  /*
    Map over the receipts array and return one row element per receipt.
    Each receipt gets its own key (the receipt's UUID) so React can track it.
  */
  return receipts.map((receipt) => {

    /*
      Look up the display config for this receipt's status.
      STATUS_CONFIG is an object like:
        { draft: { color: "#aaa", label: "Draft" }, paid: { color: "#4a4", label: "Paid" } }

      If the receipt's status isn't found in STATUS_CONFIG (shouldn't happen, but just in case),
      we fall back to the "draft" config so the badge still renders something.
    */
    let statusConfig = STATUS_CONFIG[receipt.status];
    if (!statusConfig) {
      statusConfig = STATUS_CONFIG.draft;
    }

    /*
      Format the date for display.
      The date comes from the database as an ISO string like "2025-03-01T00:00:00Z".
      toLocaleDateString() converts it to a readable format like "Mar 1, 2025".
      If there's no date, we show a dash.
    */
    let formattedDate;
    if (receipt.date) {
      formattedDate = new Date(receipt.date).toLocaleDateString();
    } else {
      formattedDate = "—";
    }

    return (
      <div
        key={receipt.id}
        className="row"
        style={{ borderBottom: "1px solid rgba(201,169,110,0.04)" }}
      >
        {/* Receipt number — shown in a monospace font with a # prefix */}
        <div
          style={{
            fontSize: 10,
            color: "rgba(201,169,110,0.6)",
            fontFamily: "IBM Plex Mono, monospace",
          }}
        >
          #{receipt.receipt_number}
        </div>

        {/* Vendor name — the business that issued the receipt */}
        <div style={{ fontSize: 11, color: "#e8e2d9" }}>
          {receipt.vendor_name}
        </div>

        {/* Customer name — the client being billed */}
        <div style={{ fontSize: 11, color: "rgba(232,226,217,0.5)" }}>
          {receipt.customer_name}
        </div>

        {/* Status badge — colour and label come from statusConfig */}
        <div>
          <span
            style={{
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: "0.12em",
              padding: "2px 6px",
              borderRadius: 0,
              background: `${statusConfig.color}18`,  // 18 = 10% opacity in hex
              color: statusConfig.color,
              border: `1px solid ${statusConfig.color}30`,  // 30 = 19% opacity in hex
              textTransform: "uppercase",
            }}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Total amount — formatted to 2 decimal places */}
        <div
          style={{
            fontSize: 11,
            color: "#e8e2d9",
            fontFamily: "IBM Plex Mono, monospace",
          }}
        >
          ${parseFloat(receipt.total).toFixed(2)}
        </div>

        {/* Date — formatted above, or "—" if missing */}
        <div style={{ fontSize: 10, color: "rgba(232,226,217,0.3)" }}>
          {formattedDate}
        </div>

        {/* Delete button — faint by default, turns red on hover */}
        <button
          onClick={() => onDelete(receipt.id)}
          style={{
            background: "none",
            border: "none",
            color: "rgba(232,226,217,0.2)",
            cursor: "pointer",
            fontSize: 11,
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#d96b6b")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(232,226,217,0.2)")}
        >
          ✕
        </button>
      </div>
    );
  });
}
