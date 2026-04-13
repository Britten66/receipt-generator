/*
  WelcomeModal.jsx — shown once to brand-new users on their first sign-in.

  Triggered in App.jsx when a SIGNED_IN event fires and the account was created
  less than 2 minutes ago (created_at age check). Using created_at instead of
  localStorage is intentional — localStorage is unreliable in iOS PWA sessions.

  Props:
    onClose — called when user clicks "Get Started" or the backdrop
*/

export default function WelcomeModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>

        <div className="modal-header">
          <span className="modal-title">Welcome to InvoicePrepper</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>
            You are all set. Start by filling in your business details in your profile, then create your first invoice.
          </div>

          <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.7 }}>
            Invoices you create are saved to your account. You can download them as PDFs, share a link, or email them directly to clients (Pro).
          </div>

          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            Questions or issues? Email us at{" "}
            <a href="mailto:support@invoiceprepper.com" style={{ color: "var(--accent)" }}>support@invoiceprepper.com</a>
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Get Started</button>
        </div>

      </div>
    </div>
  );
}
