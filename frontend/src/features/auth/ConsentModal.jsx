/*
  ConsentModal.jsx

  Fires once for any user who does not yet have terms_agreed_at on their
  profile. Covers Google OAuth users who skip the signup form checkbox.

  Blocks the app until accepted. Once accepted, terms_agreed_at is saved
  to the profile and the modal never appears again.

  Props:
    onAccept — called after saving consent, closes the modal
    onOpenLegal — called with "terms" or "privacy" to open the legal modal
*/

import { useState } from "react";

export default function ConsentModal({ onAccept, onOpenLegal }) {
  const [agreed, setAgreed]     = useState(false);
  const [optIn, setOptIn]       = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  async function handleAccept() {
    if (!agreed) { setError("You must agree to continue."); return; }
    setSaving(true);
    await onAccept({ optIn });
    setSaving(false);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 400 }}>

        <div className="modal-header">
          <span className="modal-title">Before you continue</span>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>
            To use InvoicePrepper you must agree to our terms and privacy policy.
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6 }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => { setAgreed(e.target.checked); setError(""); }}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span>
              I have read and agree to the{" "}
              <button
                type="button"
                onClick={() => onOpenLegal("terms")}
                style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}
              >
                Terms of Service
              </button>
              {" "}and{" "}
              <button
                type="button"
                onClick={() => onOpenLegal("privacy")}
                style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}
              >
                Privacy Policy
              </button>
              . *
            </span>
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6 }}>
            <input
              type="checkbox"
              checked={optIn}
              onChange={(e) => setOptIn(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span>I agree to receive email receipts and account notifications.</span>
          </label>

          {error && <div style={{ fontSize: 12, color: "var(--voided)" }}>{error}</div>}

        </div>

        <div className="modal-footer">
          <button
            className="btn btn-primary"
            onClick={handleAccept}
            disabled={saving}
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>

      </div>
    </div>
  );
}
