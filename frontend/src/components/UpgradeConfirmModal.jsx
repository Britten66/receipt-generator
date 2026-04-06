/*
  UpgradeConfirmModal.jsx — pre-checkout consent modal.

  Shown before redirecting to Stripe. The user must check a box
  acknowledging recurring billing before the "Continue to Payment" button
  is enabled. This satisfies legal/compliance expectations for subscription UX.

  Props:
    targetTier    — "pro" | "voice" — drives the price copy and modal title
    agreed        — boolean — whether the checkbox is checked
    onAgreeChange — called with the checkbox event when user toggles the checkbox
    onClose       — called when user dismisses without confirming
    onConfirm     — called when user clicks "Continue to Payment" (checkbox must be checked)
    onOpenLegal   — called with "terms" | "privacy" when user clicks those inline links
*/

export default function UpgradeConfirmModal({ targetTier, agreed, onAgreeChange, onClose, onConfirm, onOpenLegal }) {
  const isVoice = targetTier === "voice";
  const price   = isVoice ? "$12.00" : "$9.00";
  const label   = isVoice ? "Voice AI" : "Pro";

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>

        <div className="modal-header">
          <span className="modal-title">Upgrade to {label}</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
            {label}: CAD {price} / month
          </div>

          <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>
            You will be charged CAD {price} each month. Your subscription renews automatically until
            cancelled. Cancellation takes effect at the end of the current billing period. No partial refunds.
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={onAgreeChange}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span>
              I understand this is a recurring monthly subscription and I agree to the{" "}
              <button
                type="button"
                onClick={() => onOpenLegal("terms")}
                style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}
              >
                Terms of Service
              </button>
              {" "}and{" "}
              <button
                type="button"
                onClick={() => onOpenLegal("privacy")}
                style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}
              >
                Privacy Policy
              </button>.
            </span>
          </label>

          {!agreed && (
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>You must check the box above to continue.</div>
          )}

        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!agreed} onClick={onConfirm}>
            Continue to Payment →
          </button>
        </div>

      </div>
    </div>
  );
}
