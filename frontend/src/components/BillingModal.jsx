import { useState } from "react";
import { cancelSubscription, openBillingPortal } from "../api/billing";

export default function BillingModal({ profile, onClose }) {
  const [cancelling, setCancelling]       = useState(false);
  const [cancelledOn, setCancelledOn]     = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const isPaid = profile?.tier === "pro" || profile?.tier === "voice";
  const tierLabel = profile?.tier === "voice" ? "Voice AI" : "Pro";
  const tierPrice = profile?.tier === "voice" ? "CAD $12 / month" : "CAD $9 / month";

  async function handleCancel() {
    if (!window.confirm(
      "Cancel your Pro subscription?\n\nYou'll keep Pro access until the end of your current billing period, then your account reverts to Free."
    )) return;
    setCancelling(true);
    try {
      const result = await cancelSubscription();
      setCancelledOn(result.cancel_at);
    } catch (err) {
      alert(err.message || "Could not cancel. Please try again.");
    }
    setCancelling(false);
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      await openBillingPortal();
    } catch (err) {
      alert(err.message || "Could not open billing portal. Please try again.");
      setPortalLoading(false);
    }
  }

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 299 }}
        onClick={onClose}
      />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)", zIndex: 300,
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 8, padding: "20px 24px", minWidth: 300, maxWidth: 380,
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" }}>Billing</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
        </div>

        {isPaid ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{tierLabel}: {tierPrice}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Billed monthly · Cancel anytime</div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: profile?.tier === "voice" ? "#4dd8e0" : "#D4AF37", border: `1px solid ${profile?.tier === "voice" ? "#4dd8e0" : "#D4AF37"}`, padding: "2px 8px", textTransform: "uppercase" }}>{tierLabel.toUpperCase()}</span>
            </div>

            {cancelledOn ? (
              <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "8px 10px", background: "var(--surface-2)", border: "1px solid var(--border-light)", borderRadius: 4 }}>
                Subscription cancelled. Pro access ends on <strong>{cancelledOn}</strong>.
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 10, padding: "6px 12px" }}
                  onClick={handlePortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? "Opening…" : "Billing History"}
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 10, padding: "6px 12px", color: "var(--voided)" }}
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling…" : "Cancel Subscription"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <div style={{ marginBottom: 6 }}>You're on the Free plan.</div>
            <div style={{ fontSize: 11 }}>Upgrade to Pro for email invoicing and watermark-free PDFs. CAD $9/month.</div>
          </div>
        )}
      </div>
    </>
  );
}
