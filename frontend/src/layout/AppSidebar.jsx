import { NAV, STATUS_CONFIG, fmtStat } from "../lib/constants";
import { Plus, CreditCard, FileText, Trash2, HelpCircle } from "lucide-react";

export default function AppSidebar({
  receipts, revenue, outstanding, counts,
  filter, setFilter,
  profile,
  setShowProfileModal, openNewReceipt,
  setShowBilling, setLegal, setShowHelp, setShowTrash,
}) {
  return (
    <aside className="sidebar">

      <div className="sidebar-section sidebar-cta">
        <button className="btn btn-primary btn-create" onClick={openNewReceipt} aria-label="Create new invoice">
          <Plus size={16} strokeWidth={2.5} />
          <span>New Invoice</span>
        </button>
      </div>

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

      <div className="sidebar-footer">
        <button
          className="btn btn-ghost btn-business"
          onClick={() => setShowProfileModal(true)}
        >
          {profile?.business_name ? `✎ ${profile.business_name}` : "+ Add Business Profile"}
        </button>
        <div className="sidebar-footer-row" role="group" aria-label="Account actions">
          <button className="sidebar-footer-btn" onClick={() => setShowBilling(true)} aria-label="Billing">
            <CreditCard size={14} strokeWidth={1.75} />
            <span>Billing</span>
          </button>
          <button className="sidebar-footer-btn" onClick={() => setLegal("terms")} aria-label="Terms">
            <FileText size={14} strokeWidth={1.75} />
            <span>Terms</span>
          </button>
          <button className="sidebar-footer-btn trash-btn" onClick={() => setShowTrash(true)} aria-label="Recently deleted">
            <Trash2 size={14} strokeWidth={1.75} />
            <span>Trash</span>
          </button>
          <button className="sidebar-footer-btn help-btn" onClick={() => setShowHelp(true)} aria-label="Help">
            <HelpCircle size={14} strokeWidth={1.75} />
            <span>Help</span>
          </button>
        </div>
      </div>

    </aside>
  );
}
