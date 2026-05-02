/*
  UpgradeThanksModal.jsx: shown once after a successful Pro or Voice AI checkout.

  Triggered in App.jsx by the ?upgraded=true URL param polling loop: once the
  webhook confirms the tier change in the DB, the modal flag is set in localStorage
  (key: upgrade_thanks_shown_{userId}) so it only shows once per user.

  Props:
    onClose: called when user clicks "Got It" or the backdrop
*/

export default function UpgradeThanksModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>

        <div className="modal-header">
          <span className="modal-title">Thanks for upgrading!</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>
            Your account has been upgraded. All Pro features are now active.
          </div>

          <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.7 }}>
            If you run into any bugs or have feedback, we want to hear about it.
          </div>

          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            Reach us at{" "}
            <a href="mailto:support@invoiceprepper.com" style={{ color: "var(--accent)" }}>support@invoiceprepper.com</a>
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Got It</button>
        </div>

      </div>
    </div>
  );
}
