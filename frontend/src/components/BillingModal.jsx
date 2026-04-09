import { useState, useEffect } from "react";
import { cancelSubscription, openBillingPortal, fetchSubscriptionStatus } from "../api/billing";
import { FileText, Mail, Image, Mic, BarChart2, Link } from "lucide-react";

export default function BillingModal({ profile, onClose, onUpgrade }) {
  const [status,        setStatus]        = useState(null);  // null = loading
  const [statusErr,     setStatusErr]     = useState(null);
  const [cancelling,    setCancelling]    = useState(false);
  const [cancelledOn,   setCancelledOn]   = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [actionErr,     setActionErr]     = useState(null);

  const isPaid = profile?.tier === "pro" || profile?.tier === "voice";
  const tierLabel = profile?.tier === "voice" ? "Voice AI" : profile?.tier === "pro" ? "Pro" : "Free";
  const tierPrice = profile?.tier === "voice" ? "CAD $12 / mo" : "CAD $9 / mo";
  const tierColor = profile?.tier === "voice" ? "#4dd8e0" : "#6abf7b";

  // Fetch live subscription state from Stripe on open
  useEffect(() => {
    if (!isPaid) { setStatus({ status: "free" }); return; }
    fetchSubscriptionStatus()
      .then(setStatus)
      .catch(err => setStatusErr(err.message));
  }, [isPaid]);

  async function handleCancel() {
    if (!window.confirm(
      "Cancel your subscription?\n\nYou'll keep access until the end of your current billing period, then your account reverts to Free."
    )) return;
    setActionErr(null);
    setCancelling(true);
    try {
      const result = await cancelSubscription();
      setCancelledOn(result.cancel_at);
      // Optimistically update the local status so the UI reflects cancel_at_period_end
      setStatus(prev => prev ? { ...prev, cancel_at_period_end: true, cancel_at: result.cancel_at } : prev);
    } catch (err) {
      setActionErr(err.message || "Could not cancel. Please try again.");
    }
    setCancelling(false);
  }

  async function handlePortal() {
    setActionErr(null);
    setPortalLoading(true);
    try {
      await openBillingPortal();
    } catch (err) {
      setActionErr(err.message || "Could not open billing portal. Please try again.");
      setPortalLoading(false);
    }
  }

  // Determine what date line to show
  const isCancelling = cancelledOn || status?.cancel_at_period_end;
  const dateLabel    = isCancelling
    ? `Access ends ${cancelledOn || status?.cancel_at}`
    : status?.current_period_end
      ? `Next charge ${status.current_period_end}`
      : null;

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 299 }}
        onClick={onClose}
      />
      <div className="modal" style={{ zIndex: 300, maxWidth: 380 }}>

        <div className="modal-header">
          <span className="modal-title">Billing</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {isPaid ? (
            <>
              {/* Plan row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
                    {tierLabel} — {tierPrice}
                  </div>
                  {status === null && !statusErr && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>Loading billing info...</div>
                  )}
                  {statusErr && (
                    <div style={{ fontSize: 10, color: "var(--voided)", marginTop: 3 }}>{statusErr}</div>
                  )}
                  {dateLabel && (
                    <div style={{
                      fontSize: 10,
                      color: isCancelling ? "var(--voided)" : "var(--text-muted)",
                      marginTop: 3,
                    }}>
                      {dateLabel}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                  color: tierColor, border: `1px solid ${tierColor}`,
                  padding: "2px 8px", textTransform: "uppercase", whiteSpace: "nowrap",
                }}>
                  {tierLabel.toUpperCase()}
                </span>
              </div>

              {/* Cancelled notice or action buttons */}
              {isCancelling ? (
                <div style={{
                  fontSize: 11, color: "var(--text-muted)",
                  padding: "10px 12px", background: "var(--surface-2)",
                  border: "1px solid var(--border-light)",
                }}>
                  Subscription cancelled. {dateLabel}.
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 10, padding: "6px 12px" }}
                    onClick={handlePortal}
                    disabled={portalLoading}
                  >
                    {portalLoading ? "Opening..." : "Billing History"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 10, padding: "6px 12px", color: "var(--voided)" }}
                    onClick={handleCancel}
                    disabled={cancelling || status === null}
                  >
                    {cancelling ? "Cancelling..." : "Cancel Subscription"}
                  </button>
                </div>
              )}

              {actionErr && (
                <div style={{
                  fontSize: 10, color: "var(--voided)",
                  padding: "8px 10px", background: "var(--surface-2)",
                  border: "1px solid var(--border-light)",
                }}>
                  {actionErr}
                </div>
              )}
            </>
          ) : (
            /* Free plan */
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Free plan</div>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-muted)", border: "1px solid var(--border)", padding: "2px 8px", textTransform: "uppercase" }}>FREE</span>
              </div>

              {/* What's included on free */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { icon: <FileText size={12} />, text: "Unlimited invoices + PDF download" },
                  { icon: <BarChart2 size={12} />, text: "Track Draft, Sent, and Paid" },
                  { icon: <Link size={12} />, text: "Payment link + QR code on PDFs" },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-dim)" }}>
                    <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{icon}</span>
                    {text}
                  </div>
                ))}
              </div>

              {/* What Pro/Voice adds */}
              <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>Unlock with Pro / Voice AI</div>
                {[
                  { icon: <Mail size={12} />,  text: "Email invoices to clients (Pro)" },
                  { icon: <Image size={12} />, text: "Logo on every PDF (Pro)" },
                  { icon: <Mic size={12} />,   text: "Voice + text AI parsing (Voice AI)" },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
                    <span style={{ flexShrink: 0 }}>{icon}</span>
                    {text}
                  </div>
                ))}
              </div>

              {onUpgrade && (
                <button
                  className="btn"
                  style={{ fontSize: 10, padding: "8px 16px", alignSelf: "flex-start", marginTop: 4 }}
                  onClick={() => { onClose(); onUpgrade(); }}
                >
                  View Plans
                </button>
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
}
