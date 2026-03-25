export default function ReceiptList({ receipts, STATUS_CONFIG, onDelete }) {
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

  return receipts.map((r) => {
    const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.draft;
    return (
      <div
        key={r.id}
        className="row"
        style={{ borderBottom: "1px solid rgba(201,169,110,0.04)" }}
      >
        <div
          style={{
            fontSize: 10,
            color: "rgba(201,169,110,0.6)",
            fontFamily: "IBM Plex Mono, monospace",
          }}
        >
          #{r.receipt_number}
        </div>
        <div style={{ fontSize: 11, color: "#e8e2d9" }}>{r.vendor_name}</div>
        <div style={{ fontSize: 11, color: "rgba(232,226,217,0.5)" }}>
          {r.customer_name}
        </div>
        <div>
          <span
            style={{
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: "0.12em",
              padding: "2px 6px",
              borderRadius: 3,
              background: `${cfg.color}18`,
              color: cfg.color,
              border: `1px solid ${cfg.color}30`,
              textTransform: "uppercase",
            }}
          >
            {cfg.label}
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#e8e2d9",
            fontFamily: "IBM Plex Mono, monospace",
          }}
        >
          ${parseFloat(r.total).toFixed(2)}
        </div>
        <div style={{ fontSize: 10, color: "rgba(232,226,217,0.3)" }}>
          {r.date ? new Date(r.date).toLocaleDateString() : "—"}
        </div>
        <button
          onClick={() => onDelete(r.id)}
          style={{
            background: "none",
            border: "none",
            color: "rgba(232,226,217,0.2)",
            cursor: "pointer",
            fontSize: 11,
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#d96b6b")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(232,226,217,0.2)")
          }
        >
          ✕
        </button>
      </div>
    );
  });
}
