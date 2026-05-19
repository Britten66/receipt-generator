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
  // Subscriptions are always billed in CAD by Stripe regardless of the user's
  // invoice-currency preference. Showing "CAD" honestly avoids confusion for
  // international users (a "INR $9" label would be nonsense).
  void currency;

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
                <div className="plans-modal-price">$9<span>/mo</span></div>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 8px" }}>Billed in CAD</p>
                <ul className="plans-modal-features">
                  <li className="plans-modal-includes">Everything in Basic</li>
                  <li>Email invoices to clients with your logo</li>
                  <li>Invoice due dates</li>
                  <li>Send payment reminders to clients</li>
                  <li>CSV export</li>
                  <li>Custom dashboard themes</li>
                  <li className="lv2-plan-feature-voice">Text AI parsing: describe an invoice, the form fills itself</li>
                  <li className="lv2-plan-feature-voice">AI remembers your regular clients and rates</li>
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
              <div className="plans-modal-price">$12<span>/mo</span></div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 8px" }}>Billed in CAD</p>
              <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "0 0 14px", lineHeight: 1.5 }}>Great for startups, solo devs, tutors, and self-employed who track their rates.</p>
              <ul className="plans-modal-features">
                <li className="plans-modal-includes">Includes Pro Plan</li>
                <li>Works on mobile, hands-free</li>
                <li>Create invoices on the fly, anywhere</li>
                <li className="lv2-plan-feature-voice">Speak your invoice, AI fills it in</li>
                <li className="lv2-plan-feature-voice">Detects line items, prices, and clients</li>
                <li className="lv2-plan-feature-voice">Remembers your regular clients and rates</li>
                <li className="lv2-plan-feature-voice">Smart pricing: AI suggests rates from your history</li>
                <li className="lv2-plan-feature-voice">Translate invoices into your client's language</li>
                <li className="lv2-plan-feature-voice">First access to new AI features</li>
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
