import { useRef } from "react";
import { fmt, fmtDate } from "../../lib/constants";
import StatusBadge from "./StatusBadge";

export default function InvoiceGrid({
  loading, filtered, selectedReceipt,
  swipedId, setSwipedId,
  handleDelete, selectFull, openEditReceipt,
  viewMode = "grid",
}) {
  /*
    Swipe state tracked per touch sequence:
      x, y         starting touch coordinates
      dragging     became true once intent is clearly horizontal
      justSwiped   set right after a swipe ends so the synthetic click that
                   iOS fires next does not immediately close the swipe
  */
  const touchState = useRef({ x: 0, y: 0, dragging: false, justSwiped: false });

  if (loading) return <div className="empty">Loading...</div>;

  if (filtered.length === 0) {
    return <div className="empty" style={{ textAlign: "center", width: "100%" }}>No invoices found</div>;
  }

  return (
    <div className={`receipt-grid${viewMode === "row" ? " view-row" : ""}`}>
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
            onTouchStart={(e) => {
              touchState.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                dragging: false,
                justSwiped: false,
              };
            }}
            onTouchMove={(e) => {
              const t = e.touches[0];
              const dx = t.clientX - touchState.current.x;
              const dy = t.clientY - touchState.current.y;
              /*
                Intent detection. Until the user moves past a small dead zone,
                do nothing. Once they move, if vertical motion dominates, bail
                so the page scrolls naturally. Otherwise lock into a horizontal
                drag for the rest of this touch sequence.
              */
              if (!touchState.current.dragging) {
                if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
                if (Math.abs(dy) > Math.abs(dx)) return;
                touchState.current.dragging = true;
              }
              const base    = swipedId === r.id ? -76 : 0;
              const clamped = Math.max(Math.min(base + dx, 0), -76);
              e.currentTarget.style.transition = "none";
              e.currentTarget.style.transform  = `translate3d(${clamped}px, 0, 0)`;
            }}
            onTouchEnd={(e) => {
              if (!touchState.current.dragging) return;
              const dx = e.changedTouches[0].clientX - touchState.current.x;
              const wasSwiped = swipedId === r.id;
              /*
                Snap to the nearest resting position (0 or -76) with a smooth
                transition. Setting transform AND transition together lets the
                browser animate from the finger's last position to the target
                in one motion instead of bouncing to 0 first then to -76.
              */
              const target = wasSwiped ? (dx > 30 ? 0 : -76) : (dx < -40 ? -76 : 0);
              e.currentTarget.style.transition = "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)";
              e.currentTarget.style.transform  = `translate3d(${target}px, 0, 0)`;

              if (wasSwiped && target === 0) setSwipedId(null);
              else if (!wasSwiped && target === -76) setSwipedId(r.id);

              touchState.current.justSwiped = true;
              touchState.current.dragging = false;
              setTimeout(() => { touchState.current.justSwiped = false; }, 350);
            }}
            onTransitionEnd={(e) => {
              /*
                After the snap animation, hand control back to the .swiped CSS
                class by clearing the inline transform. The visual position is
                already where CSS would put it, so this swap is invisible.
              */
              if (e.target === e.currentTarget && e.propertyName === "transform") {
                e.currentTarget.style.transition = "";
                e.currentTarget.style.transform  = "";
              }
            }}
            onClick={() => {
              if (touchState.current.justSwiped) return;
              if (swipedId === r.id) { setSwipedId(null); return; }
              selectFull(r.id);
            }}
            onDoubleClick={() => openEditReceipt(r)}
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
            <div className="card-date" aria-label="Invoice date">{fmtDate(r.date)}</div>
            <div className="card-customer">{r.vendor_name}</div>
            <div className="card-footer">
              <StatusBadge status={r.status} />
              <span className="card-total">{fmt(r.total, r.currency)}</span>
            </div>
          </div>

        </div>
      ))}
    </div>
  );
}
