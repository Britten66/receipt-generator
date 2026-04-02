import { useState, useEffect, useRef } from "react";
import LegalModal from "./LegalModal";
import BorderGlow from "./BorderGlow";
import "./LandingPage.css";

const MOCK_INVOICE = {
  receipt_number: "REC-000042",
  vendor_name: "Maple & Co. Creative",
  customer_name: "Summit Tech Solutions",
  date: "April 1, 2026",
  line_items: [
    { description: "Brand Identity Package", quantity: 1, unit_price: 1200.00, total: 1200.00 },
    { description: "Social Media Asset Kit", quantity: 3, unit_price: 180.00, total: 540.00 },
    { description: "Revision Round", quantity: 2, unit_price: 95.00, total: 190.00 },
  ],
  subtotal: 1930.00,
  tax: 250.90,
  total: 2180.90,
  notes: "Thank you for your business. Payment due within 14 days.",
};

function MockInvoice() {
  const fmt = (n) => `$${n.toFixed(2)}`;
  return (
    <div className="mock-invoice">
      <div className="mock-invoice-header">
        <span className="mock-invoice-label">INVOICE</span>
        <span className="mock-invoice-num">#{MOCK_INVOICE.receipt_number}</span>
      </div>
      <div className="mock-invoice-parties">
        <div>
          <div className="mock-party-label">FROM</div>
          <div className="mock-party-name">{MOCK_INVOICE.vendor_name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="mock-party-label">BILLED TO</div>
          <div className="mock-party-name">{MOCK_INVOICE.customer_name}</div>
        </div>
      </div>
      <div className="mock-invoice-date">Date: {MOCK_INVOICE.date}</div>
      <table className="mock-invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_INVOICE.line_items.map((li, i) => (
            <tr key={i}>
              <td>{li.description}</td>
              <td>{li.quantity}</td>
              <td>{fmt(li.unit_price)}</td>
              <td>{fmt(li.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mock-invoice-totals">
        <div className="mock-total-row"><span>Subtotal</span><span>{fmt(MOCK_INVOICE.subtotal)}</span></div>
        <div className="mock-total-row"><span>Tax</span><span>{fmt(MOCK_INVOICE.tax)}</span></div>
        <div className="mock-total-row mock-total-final"><span>Total</span><span>{fmt(MOCK_INVOICE.total)}</span></div>
      </div>
      {MOCK_INVOICE.notes && (
        <div className="mock-invoice-notes">{MOCK_INVOICE.notes}</div>
      )}
      <div className="mock-invoice-footer">— invoiceprepper.com —</div>
    </div>
  );
}

export default function LandingPage({ onEnter, onEnterPro, onSignIn, darkMode, onToggleDark }) {
  const [legal, setLegal] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let pos = 0;
    const max = el.scrollHeight - el.clientHeight;
    let dir = 1;
    const tick = setInterval(() => {
      pos += dir * 0.6;
      if (pos >= max) { pos = max; dir = -1; }
      if (pos <= 0)   { pos = 0;   dir = 1;  }
      el.scrollTop = pos;
    }, 16);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="landing-v2">
      <div className="lv2-topbar">
        <button className="lv2-signin" onClick={onSignIn}>Sign In</button>
        <button className="dark-toggle" onClick={onToggleDark}>
          {darkMode ? "Light" : "Dark"}
        </button>
      </div>

      {/* Hero */}
      <section className="lv2-hero">
        <div className="lv2-hero-text">
          <p className="lv2-eyebrow">Invoice Prepper</p>
          <h1 className="lv2-title">Invoicing for<br />freelancers who<br />just want to get paid.</h1>
          <p className="lv2-desc">Create invoices, track what's paid, send directly to clients. No bloat, no learning curve.</p>
          <button className="lv2-cta" onClick={onEnter}>Create Free Account</button>
          <p className="lv2-sub">Free forever · No credit card required</p>
        </div>

        <div className="lv2-preview-wrap">
          <BorderGlow
            borderRadius={0}
            glowColor={darkMode ? "38 55 75" : "0 0 8"}
            glowIntensity={darkMode ? 0.9 : 0.75}
            glowRadius={48}
            edgeSensitivity={12}
            coneSpread={20}
            fillOpacity={0.2}
            colors={darkMode ? ["#e8d9a8", "#c8b98a", "#a09070"] : ["#1a1a18", "#2e2c28", "#3d3a30"]}
            backgroundColor="transparent"
            className="lv2-border-glow"
          >
            <div className="lv2-hero-preview" ref={scrollRef}>
              <MockInvoice />
            </div>
          </BorderGlow>
          <div className="lv2-hero-reflection" aria-hidden="true">
            <MockInvoice />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="lv2-pricing">
        <h2 className="lv2-pricing-title">Simple pricing</h2>
        <div className="lv2-plans">

          <BorderGlow
            borderRadius={0}
            glowColor={darkMode ? "38 55 75" : "0 0 8"}
            glowIntensity={darkMode ? 0.9 : 0.75}
            glowRadius={36}
            edgeSensitivity={8}
            coneSpread={30}
            fillOpacity={0.15}
            colors={darkMode ? ["#e8d9a8", "#c8b98a", "#a09070"] : ["#1a1a18", "#2e2c28", "#3d3a30"]}
            backgroundColor="transparent"
            className="lv2-plan-glow"
          >
            <div className="lv2-plan">
              <div className="lv2-plan-name">Free</div>
              <div className="lv2-plan-price">$0<span>/mo</span></div>
              <ul className="lv2-plan-features">
                <li>Unlimited invoices</li>
                <li>PDF download</li>
                <li>Draft, send, paid tracking</li>
                <li>Dark mode</li>
                <li className="lv2-plan-caveat">PDF includes invoiceprepper.com footer</li>
                <li className="lv2-plan-caveat">No email sending to clients</li>
              </ul>
              <button className="lv2-plan-btn lv2-plan-btn-ghost" onClick={onEnter}>Try for Free</button>
            </div>
          </BorderGlow>

          <BorderGlow
            borderRadius={0}
            glowColor={darkMode ? "38 55 75" : "0 0 8"}
            glowIntensity={darkMode ? 1.0 : 0.85}
            glowRadius={40}
            edgeSensitivity={5}
            coneSpread={35}
            fillOpacity={0.2}
            colors={darkMode ? ["#e8d9a8", "#c8b98a", "#a09070"] : ["#1a1a18", "#2e2c28", "#3d3a30"]}
            backgroundColor="transparent"
            className="lv2-plan-glow"
          >
            <div className="lv2-plan lv2-plan-pro">
              <div className="lv2-plan-name">Pro</div>
              <div className="lv2-plan-price">$6<span>/mo</span></div>
              <ul className="lv2-plan-features">
                <li>Unlimited invoices</li>
                <li>Clean PDF — no watermark</li>
                <li>Email invoices directly to clients</li>
                <li>Your logo & business details on every invoice</li>
                <li>Pay Now button — get paid faster</li>
                <li>Customizable dashboard themes</li>
                <li>One tool. Every invoice. Done.</li>
              </ul>
              <button className="lv2-plan-btn lv2-plan-btn-primary" onClick={onEnterPro ?? onEnter}>Get Pro — $6/mo</button>
            </div>
          </BorderGlow>

        </div>
      </section>

      {/* Footer */}
      <footer className="lv2-footer">
        <p>
          <button onClick={() => setLegal("terms")} className="lv2-footer-link">Terms</button>
          {" · "}
          <button onClick={() => setLegal("privacy")} className="lv2-footer-link">Privacy</button>
        </p>
        <p className="lv2-footer-disclaimer">For personal record-keeping only. Not a substitute for professional accounting or tax advice.</p>
      </footer>

      {legal && <LegalModal type={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}
