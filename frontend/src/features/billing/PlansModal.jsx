/*
  PlansModal.jsx: "Choose your plan" modal shown before Stripe checkout.

  Shows Pro and Voice AI cards side by side (or just Voice if user is already Pro).
  Clicking a plan card calls onSelectPro / onSelectVoice, which opens the consent
  modal (UpgradeConfirmModal) before redirecting to Stripe.

  Props:
    profile      : user profile object; used to decide which cards to show
    darkMode     : boolean; drives the BorderGlow accent colours
    onClose      : called when user dismisses without selecting
    onSelectPro  : called when user clicks "Get Pro"
    onSelectVoice: called when user clicks "Get Voice AI"
*/

import BorderGlow from "../../layout/BorderGlow";

export default function PlansModal({ profile, darkMode, currency, onClose, onSelectPro, onSelectVoice }) {
  const isProUser = profile?.tier === "pro";
  const currencyLabel = currency === "USD" ? "USD" : "CAD";

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal plans-modal" style={{ maxWidth: 600 }}>

        <div className="modal-header">
          <span className="modal-title">{isProUser ? "Upgrade to Voice AI" : "Choose your plan"}</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={onClose}>✕</button>
        </div>

        <div
          className="modal-body plans-modal-body"
          style={{ display: "grid", gridTemplateColumns: isProUser ? "1fr" : "1fr 1fr", gap: 16, padding: 20 }}
        >

          {/* Pro card: only shown to free users */}
          {(profile?.tier === "free" || !profile?.tier) && (
            <BorderGlow
              borderRadius={0}
              glowColor={darkMode ? "43 78 55" : "43 85 38"}
              glowIntensity={darkMode ? 1.0 : 2.2}
              glowRadius={darkMode ? 40 : 56}
              edgeSensitivity={5}
              coneSpread={35}
              fillOpacity={darkMode ? 0.2 : 0.5}
              colors={darkMode ? ["#E8B840", "#D4A030", "#C09020"] : ["#1a1814", "#252318", "#2e2c20"]}
              backgroundColor="transparent"
              className="plans-modal-glow"
            >
              <div className="plans-modal-card">
                <div className="plans-modal-name">Pro</div>
                <div className="plans-modal-price">{currencyLabel} $9<span>/mo</span></div>
                <ul className="plans-modal-features">
                  <li className="plans-modal-includes">Everything in Free</li>
                  <li>Email invoices straight to clients with your logo</li>
                  <li>Text AI parsing: describe an invoice, the form fills itself (15 per day)</li>
                  <li>Send payment reminders to clients who haven't paid</li>
                  <li>No watermark on any PDF</li>
                  <li>CSV export ready for your accountant</li>
                  <li>Custom dashboard themes</li>
                </ul>
                <button className="plans-modal-btn plans-modal-btn-pro" onClick={onSelectPro}>
                  Get Pro
                </button>
              </div>
            </BorderGlow>
          )}

          {/* Voice AI card: shown to both free and pro users */}
          <BorderGlow
            borderRadius={0}
            glowColor={darkMode ? "185 75 55" : "185 72 32"}
            glowIntensity={darkMode ? 0.95 : 2.2}
            glowRadius={darkMode ? 38 : 56}
            edgeSensitivity={5}
            coneSpread={32}
            fillOpacity={darkMode ? 0.18 : 0.5}
            colors={darkMode ? ["#4dd8e0", "#38c8d0", "#28b8c0"] : ["#0a1c1e", "#0e2226", "#1a1a1a"]}
            backgroundColor="transparent"
            className="plans-modal-glow"
          >
            <div className="plans-modal-card">
              <div className="plans-modal-name">Voice AI</div>
              <div className="plans-modal-price">{currencyLabel} $12<span>/mo</span></div>
              <ul className="plans-modal-features">
                <li className="plans-modal-includes">Includes Pro Plan</li>
                <li>Speak your invoice, AI fills it in</li>
                <li>Works on mobile, hands-free</li>
                <li>Detects line items, prices, and clients</li>
                <li>Remembers your regular clients and rates</li>
                <li>Create invoices on the fly, anywhere</li>
                <li>Unlimited Voice AI and Text AI parses</li>
                <li>Your invoicing companion on every job</li>
                <li>Speak or type. Smart parsing does the rest</li>
                <li>First access to new AI features</li>
              </ul>
              <button className="plans-modal-btn plans-modal-btn-voice" onClick={onSelectVoice}>
                Get Voice AI
              </button>
            </div>
          </BorderGlow>

        </div>

      </div>
    </div>
  );
}
