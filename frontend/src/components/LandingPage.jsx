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
          Stop losing invoices, chasing payments, and guessing what’s outstanding. Quickly generate clear, professional receipts and keep every invoice organized so you get paid faster with less admin stress.
        </p>

        <button className="landing-bubble" onClick={onEnter}>
          Start Now
        </button>

        <p style={{ marginTop: 24, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
          By continuing you agree to our{" "}
          <button onClick={() => setLegal("terms")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", textDecoration: "underline", cursor: "pointer", fontSize: 10, padding: 0 }}>Terms</button>
          {" "}and{" "}
          <button onClick={() => setLegal("privacy")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", textDecoration: "underline", cursor: "pointer", fontSize: 10, padding: 0 }}>Privacy Policy</button>
        </p>
      </div>

      {legal && <LegalModal type={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}