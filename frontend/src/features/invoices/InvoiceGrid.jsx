import { useRef } from "react";
import { fmt } from "../../lib/constants";
import StatusBadge from "./StatusBadge";

export default function InvoiceGrid({
  loading, filtered, selectedReceipt,
  swipedId, setSwipedId,
  handleDelete, selectFull,
}) {
  const touchStartX = useRef(0);

  if (loading) return <div className="empty">Loading...</div>;

  if (filtered.length === 0) {
    return <div className="empty" style={{ textAlign: "center", width: "100%" }}>No invoices found</div>;
  }

  return (
    <div className="receipt-grid">
      {filtered.map((r) => (
        <div key={r.id} className="swipe-wrapper">

          <button
            className="swipe-delete-btn"
            onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
          >
            Delete
          </button>

          <div
            className={`receipt-card${selectedReceipt?.id === r.id ? " selected" : ""}${swipedId === r.id ? " swiped" : ""}`}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchMove={(e) => {
              const dx      = e.touches[0].clientX - touchStartX.current;
              const base    = swipedId === r.id ? -76 : 0;
              const clamped = Math.max(Math.min(base + dx, 0), -76);
              e.currentTarget.style.transition = "none";
              e.currentTarget.style.transform  = `translateX(${clamped}px)`;
            }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              e.currentTarget.style.transition = "";
              e.currentTarget.style.transform  = "";
              if (swipedId === r.id) { if (dx > 30) setSwipedId(null); }
              else                   { if (dx < -40) setSwipedId(r.id); }
            }}
            onClick={() => {
              if (swipedId === r.id) { setSwipedId(null); return; }
              selectFull(r.id);
            }}
          >
            <div className="card-top-row">
              <span className="card-num">{r.receipt_number}</span>
              <button
                className="card-delete"
                onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                title="Delete"
              >✕</button>
            </div>
            <div className="card-vendor">{r.customer_name}</div>
            <div className="card-customer">{r.vendor_name}</div>
            <div className="card-footer">
              <StatusBadge status={r.status} />
              <span className="card-total">{fmt(r.total)}</span>
            </div>
          </div>

        </div>
      ))}
    </div>
  );
}
