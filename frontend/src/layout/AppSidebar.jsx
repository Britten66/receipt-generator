import { NAV, STATUS_CONFIG, fmtStat } from "../lib/constants";

export default function AppSidebar({
  receipts, revenue, outstanding, counts,
  filter, setFilter,
  profile,
  setShowProfileModal, openNewReceipt,
  setShowBilling, setLegal, setShowHelp,
}) {
  return (
    <aside className="sidebar">

      <div className="sidebar-section">
        <div className="stat-block">
          <div className="stat-label">Revenue</div>
          <div className="stat-value">{fmtStat(revenue)}</div>
        </div>
        <div className="stat-block">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value">{fmtStat(outstanding)}</div>
          <div className="stat-sub">inc. tax</div>
        </div>
        <div className="stat-block">
          <div className="stat-label">Invoices</div>
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

      <div style={{ marginTop: "auto", padding: 12, borderTop: "1px solid var(--border-light)", display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          className="btn btn-ghost"
          style={{ width: "100%", fontSize: 12, letterSpacing: "0.06em" }}
          onClick={() => setShowProfileModal(true)}
        >
          {profile?.business_name ? `✎ ${profile.business_name}` : "+ Add Business Profile"}
        </button>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={openNewReceipt}>
          + New Invoice
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 4 }}>
          <button onClick={() => setShowBilling(true)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}>Billing</button>
          <button onClick={() => setLegal("terms")} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}>Terms</button>
          <button className="help-btn" onClick={() => setShowHelp(true)} aria-label="Help">?</button>
        </div>
      </div>

    </aside>
  );
}
