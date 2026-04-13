import { useEffect } from "react";
import { useTrash } from "./useTrash";
import { fmt } from "../../../lib/constants";

export default function TrashModal({ onClose, showToast, onRestored }) {
  const { deleted, loading, working, load, handleRestore, handlePurge } = useTrash({ showToast, onRestored });

  useEffect(() => { load(); }, [load]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>

        <div className="modal-header">
          <span className="modal-title">Recently Deleted</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ gap: 0, padding: 0 }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>Loading...</div>
          ) : deleted.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 12, letterSpacing: "0.06em" }}>
              Trash is empty
            </div>
          ) : (
            <>
              <div style={{ padding: "10px 16px 6px", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", borderBottom: "1px solid var(--border-light)" }}>
                Invoices are permanently deleted after 30 days.
              </div>
              {deleted.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 16px", borderBottom: "1px solid var(--border-light)",
                    gap: 12, opacity: working === r.id ? 0.5 : 1,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text)", letterSpacing: "0.06em" }}>
                      {r.receipt_number}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.customer_name} · {fmt(r.total)}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      Deleted {new Date(r.deleted_at).toLocaleDateString("en-CA")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 10, padding: "5px 10px" }}
                      onClick={() => handleRestore(r.id)}
                      disabled={!!working}
                    >
                      Restore
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ fontSize: 10, padding: "5px 10px" }}
                      onClick={() => handlePurge(r.id, r.receipt_number)}
                      disabled={!!working}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>

      </div>
    </div>
  );
}
