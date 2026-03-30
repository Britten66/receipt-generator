import { useState } from "react";
import LegalModal from "./LegalModal";
import "./LandingPage.css";

export default function LandingPage({ onEnter }) {
  const [legal, setLegal] = useState(null);

  return (
    <div className="landing">
      <div className="landing-card">
        <p className="landing-eyebrow">Keep Track - Invoice Tracking</p>
        <h1 className="landing-title">
          Stay on top
          <br />
          Of every invoice
        </h1>
        <p className="landing-desc">
          Create receipts, track what’s paid, what’s outstanding, and send invoices directly to clients.
        </p>

        <ul className="landing-perks">
          <li>Save receipts, access them anywhere</li>
          <li>Track paid, sent, draft, and voided invoices</li>
          <li>Export to PDF in one click</li>
          <li>Your data stays yours, no ads</li>
        </ul>

        <button className="landing-bubble" onClick={onEnter}>
          Start Now
        </button>

        <div style={{ marginTop: 24, textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
            By continuing you agree to our{" "}
            <button onClick={() => setLegal("terms")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", textDecoration: "underline", cursor: "pointer", fontSize: 10, padding: 0 }}>Terms</button>
            {" "}and{" "}
            <button onClick={() => setLegal("privacy")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", textDecoration: "underline", cursor: "pointer", fontSize: 10, padding: 0 }}>Privacy Policy</button>
          </p>
          <p style={{ margin: 0, fontSize: 9, color: "rgba(255,255,255,0.25)", lineHeight: 1.6 }}>
            For personal record-keeping only. Not a substitute for professional accounting or tax advice.
            Receipts generated here may not be legally valid in all jurisdictions.
          </p>
        </div>
      </div>

      {legal && <LegalModal type={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}