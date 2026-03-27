export default function UpgradeModal({ token, onClose }) {
  const handleUpgrade = async () => {
    const res = await fetch("/api/billing?action=checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400, textAlign: "center" }}>
        <div className="modal-header" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ paddingTop: 0 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
            Upgrade to Pro
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 24, lineHeight: 1.6 }}>
            Everything in Free, plus:
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", textAlign: "left" }}>
            {[
              ["🖼", "Logo on every PDF"],
              ["✉", "Email invoices directly to clients"],
              ["🏷", "Remove footer branding"],
              ["⚡", "Priority support"],
            ].map(([icon, label]) => (
              <li key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13, color: "var(--text)" }}>
                <span style={{ width: 20, textAlign: "center" }}>{icon}</span>
                {label}
              </li>
            ))}
          </ul>

          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
            $7 <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-dim)" }}>/month</span>
          </div>
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 20 }}>
            Cancel any time · Billed via Stripe
          </p>

          <button className="btn btn-primary" style={{ width: "100%", padding: "12px" }} onClick={handleUpgrade}>
            Upgrade to Pro →
          </button>
        </div>
      </div>
    </div>
  );
}
