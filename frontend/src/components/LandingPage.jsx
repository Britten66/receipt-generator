import { useState, useEffect, useRef } from "react";
import LegalModal from "./LegalModal";
import BorderGlow from "./BorderGlow";
import Threads from "./Threads";
import "./LandingPage.css";

const MOCK_INVOICE = {
  receipt_number: "INV-001042",
  vendor_name: "Maple & Co. Creative",
  customer_name: "Summit Tech Solutions",
  date: "March 14, 2026",
  line_items: [
    { description: "Brand Identity Package", quantity: 1, unit_price: 1200.00, total: 1200.00 },
    { description: "Social Media Asset Kit", quantity: 3, unit_price: 180.00, total: 540.00 },
    { description: "Revision Round", quantity: 2, unit_price: 95.00, total: 190.00 },
  ],
  subtotal: 1930.00,
  tax: 250.90,
  total: 2180.90,
  notes: "Payment due within 14 days. Thank you for your business.",
};

function MockInvoice() {
  const fmt = (n) => `$${parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="mock-invoice">
      {/* Header bar */}
      <div className="mock-invoice-header">
        <span className="mock-invoice-label">INVOICE</span>
        <span className="mock-invoice-num">{MOCK_INVOICE.receipt_number}</span>
      </div>

      {/* Parties row */}
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

      {/* Meta row: date + status badge */}
      <div className="mock-invoice-meta">
        <span>{MOCK_INVOICE.date}</span>
        <span className="mock-status-badge mock-status-sent">Sent</span>
      </div>

      <div className="mock-invoice-divider" />

      <table className="mock-invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_INVOICE.line_items.map((li, i) => (
            <tr key={i}>
              <td>{li.description}</td>
              <td className="mock-num">{li.quantity}</td>
              <td className="mock-num">{fmt(li.unit_price)}</td>
              <td className="mock-num">{fmt(li.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mock-invoice-totals">
        <div className="mock-total-row"><span>Subtotal</span><span>{fmt(MOCK_INVOICE.subtotal)}</span></div>
        <div className="mock-total-row"><span>Tax (13%)</span><span>{fmt(MOCK_INVOICE.tax)}</span></div>
        <div className="mock-total-row mock-total-final"><span>Total</span><span>{fmt(MOCK_INVOICE.total)}</span></div>
      </div>

      <div className="mock-invoice-notes">{MOCK_INVOICE.notes}</div>
    </div>
  );
}

export default function LandingPage({ onEnter, onEnterPro, onEnterVoice, onSignIn, onSignUp, darkMode, onToggleDark }) {
  const [legal, setLegal] = useState(null);
  const navRef = useRef(null);

  // Lazy-follow nav: velocity-based drag that decays back to 0
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let lastScrollY = window.scrollY;
    let offset = 0;
    let rafId;

    const loop = () => {
      const scrollY = window.scrollY;
      const velocity = scrollY - lastScrollY;
      lastScrollY = scrollY;
      // Push nav opposite to scroll direction, decay back to resting position
      offset += velocity * 0.25;
      offset *= 0.7;
      offset = Math.max(-14, Math.min(14, offset));
      nav.style.transform = `translateY(${(-offset).toFixed(2)}px)`;
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="landing-v2">

      {/* Lazy-follow nav */}
      <nav className="lv2-topbar" ref={navRef}>
        <div className="lv2-nav-controls">
          <button className="dark-toggle" onClick={onToggleDark}>
            {darkMode ? "Light" : "Dark"}
          </button>
          <button className="lv2-nav-login" onClick={onSignIn}>Sign In</button>
          <button className="lv2-signin" onClick={onSignUp}>Sign Up</button>
        </div>
      </nav>

      {/* 2 — Hero: hook + invoice preview */}
      <section className="lv2-hero">
        <div className="lv2-hero-text">
          <p className="lv2-eyebrow">InvoicePrepper</p>
          <h1 className="lv2-title">The invoice generator<br />for people who<br />just want to get paid.</h1>
          <p className="lv2-desc">Create professional invoices, email to clients, and track what's paid; all in one place. Built for independent workers, contractors, and small businesses. No bloat, no learning curve.</p>
          <button className="lv2-cta" onClick={onEnter}>Start Invoicing Free</button>
          <p className="lv2-sub">Free forever · No credit card required</p>
        </div>

        <div className="lv2-preview-wrap">
          <BorderGlow
            borderRadius={0}
            glowColor={darkMode ? "38 55 75" : "0 0 8"}
            glowIntensity={darkMode ? 0.9 : 0.75}
            glowRadius={20}
            edgeSensitivity={12}
            coneSpread={20}
            fillOpacity={0.2}
            colors={darkMode ? ["#e8d9a8", "#c8b98a", "#a09070"] : ["#1a1a18", "#2e2c28", "#3d3a30"]}
            backgroundColor="transparent"
            className="lv2-border-glow"
          >
            <div className="lv2-hero-preview" aria-label="Sample invoice preview">
              <MockInvoice />
            </div>
          </BorderGlow>
        </div>
      </section>

      {/* 3 — Features */}

      {/* 5 — How it works */}
      <section className="lv2-steps">
        <p className="lv2-steps-eyebrow">How it works</p>
        <h2 className="lv2-steps-title">Up and running in minutes</h2>
        <div className="lv2-steps-grid">
          <div className="lv2-step">
            <div className="lv2-step-num">01</div>
            <div className="lv2-step-label">Create your invoice</div>
            <p className="lv2-step-desc">Fill in your business details, add line items, set your rate. Done in under two minutes.</p>
          </div>
          <div className="lv2-step">
            <div className="lv2-step-num">02</div>
            <div className="lv2-step-label">Send to your client</div>
            <p className="lv2-step-desc">Email directly from the app or download the PDF. No switching between tools.</p>
          </div>
          <div className="lv2-step">
            <div className="lv2-step-num">03</div>
            <div className="lv2-step-label">Track and get paid</div>
            <p className="lv2-step-desc">Mark invoices as sent or paid. See exactly what is outstanding at a glance.</p>
          </div>
        </div>
      </section>

      {/* 6 — Threads break */}
      <div className="lv2-texture-break" aria-hidden="true">
        <Threads
          color={darkMode ? [0.85, 0.72, 0.45] : [0.22, 0.2, 0.18]}
          amplitude={1.0}
          distance={0.2}
          enableMouseInteraction={true}
        />
      </div>

      {/* 7 — Pricing */}
      <section className="lv2-pricing">
        <h2 className="lv2-pricing-title">Simple pricing</h2>
        <p className="lv2-pricing-sub">Start free. Upgrade when you're ready.</p>
        <div className="lv2-plans">

          <BorderGlow
            borderRadius={0}
            glowColor={darkMode ? "220 12 70" : "220 20 18"}
            glowIntensity={darkMode ? 0.9 : 2.2}
            glowRadius={darkMode ? 36 : 60}
            edgeSensitivity={8}
            coneSpread={30}
            fillOpacity={darkMode ? 0.15 : 0.55}
            colors={darkMode ? ["#b8bcc8", "#a4a8b4", "#9094a0"] : ["#555866", "#464a58", "#383c4a"]}
            backgroundColor="transparent"
            className="lv2-plan-glow"
          >
            <div className="lv2-plan">
              <div className="lv2-plan-name">Free</div>
              <div className="lv2-plan-price">CAD $0<span>/mo</span></div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 8px" }}>No credit card required</p>
              <ul className="lv2-plan-features">
                <li>Unlimited invoices</li>
                <li>PDF download and share link</li>
                <li>Email invoices to clients</li>
                <li>Draft, sent, paid tracking</li>
                <li>Dark mode</li>
                <li className="lv2-plan-caveat">PDF includes invoiceprepper.com footer</li>
                <li className="lv2-plan-caveat">Emails sent from InvoicePrepper address</li>
              </ul>
              <button className="lv2-plan-btn lv2-plan-btn-ghost" onClick={onEnter}>Get Started Free</button>
            </div>
          </BorderGlow>

          <BorderGlow
            borderRadius={0}
            glowColor={darkMode ? "43 78 55" : "43 85 38"}
            glowIntensity={darkMode ? 1.0 : 2.2}
            glowRadius={darkMode ? 40 : 62}
            edgeSensitivity={5}
            coneSpread={35}
            fillOpacity={darkMode ? 0.2 : 0.55}
            colors={darkMode ? ["#E8B840", "#D4A030", "#C09020"] : ["#1a1814", "#252318", "#2e2c20"]}
            backgroundColor="transparent"
            className="lv2-plan-glow"
          >
            <div className="lv2-plan lv2-plan-pro">
              <div className="lv2-plan-name">Pro</div>
              <div className="lv2-plan-price">CAD $9<span>/mo</span></div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 8px" }}>Billed monthly · Cancel anytime</p>
              <ul className="lv2-plan-features">
                <li>Everything in Free</li>
                <li>Clean PDF, no watermark</li>
                <li>Your business name on every email</li>
                <li>Share via text, WhatsApp, or any app</li>
                <li>Your logo on every invoice and PDF</li>
                <li>Pay Now button on every invoice</li>
                <li>Customizable dashboard themes</li>
              </ul>
              <button className="lv2-plan-btn lv2-plan-btn-primary" onClick={onEnterPro}>Get Pro</button>
            </div>
          </BorderGlow>

          {/* Voice AI card — teal glow, separate CSS shadow in .lv2-plan-voice */}
          <BorderGlow
            borderRadius={0}
            glowColor={darkMode ? "185 75 55" : "185 72 32"}
            glowIntensity={darkMode ? 0.95 : 2.2}
            glowRadius={darkMode ? 38 : 60}
            edgeSensitivity={5}
            coneSpread={32}
            fillOpacity={darkMode ? 0.18 : 0.55}
            colors={darkMode ? ["#4dd8e0", "#38c8d0", "#28b8c0"] : ["#0a1c1e", "#0e2226", "#1a1a1a"]}
            backgroundColor="transparent"
            className="lv2-plan-glow"
          >
            <div className="lv2-plan lv2-plan-voice">
              <div className="lv2-plan-name">Voice AI</div>
              <div className="lv2-plan-price">CAD $12<span>/mo</span></div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 8px" }}>Billed monthly · Cancel anytime</p>
              <ul className="lv2-plan-features">
                <li>Everything in Pro</li>
                <li>Speak your invoice, AI fills it in</li>
                <li>Detects multiple line items naturally</li>
                <li>Works on mobile, no typing needed</li>
                <li>20 AI parses per day</li>
                <li style={{ color: "var(--text-muted)", fontSize: 11 }}>
                  <span style={{ fontSize: 9, padding: "1px 5px", background: "rgba(77,216,224,0.15)", border: "1px solid rgba(77,216,224,0.3)", borderRadius: 2, letterSpacing: "0.08em", fontWeight: 700, textTransform: "uppercase", color: "#0a8a96", marginRight: 5 }}>beta</span>
                  First on new AI features
                </li>
              </ul>
              <button className="lv2-plan-btn lv2-plan-btn-voice" onClick={onEnterVoice}>Get Voice AI</button>
            </div>
          </BorderGlow>

        </div>
      </section>

      {/* 8 — FAQ */}
      <section className="lv2-faq-editorial">
        <div className="lv2-faq-left">
          <span className="lv2-faq-eyebrow">Common Questions</span>
          <h2 className="lv2-faq-headline">Simple answers.</h2>
          <p className="lv2-faq-tagline">Everything you need to know before you send your first invoice.</p>
        </div>
        <div className="lv2-faq-right">
          <div className="lv2-faq-item2">
            <h3 className="lv2-faq-q2">Is the free plan really free?</h3>
            <p className="lv2-faq-a2">Yes, forever. No trial period, no credit card required. Create and send unlimited invoices at no cost.</p>
          </div>
          <div className="lv2-faq-item2">
            <h3 className="lv2-faq-q2">Is my data safe?</h3>
            <p className="lv2-faq-a2">All data is encrypted in transit and at rest. Your invoice data is never sold or shared with third parties.</p>
          </div>
          <div className="lv2-faq-item2">
            <h3 className="lv2-faq-q2">What is the Voice AI plan?</h3>
            <p className="lv2-faq-a2">Say your invoice out loud and the AI fills in your client, line items, quantities, and prices automatically. It handles multiple items in one sentence and gets smarter as it learns your clients and rates. You always review before sending.</p>
          </div>
          <div className="lv2-faq-item2">
            <h3 className="lv2-faq-q2">Is my voice data stored?</h3>
            <p className="lv2-faq-a2">No. Audio is sent to Groq for transcription and deleted immediately after. InvoicePrepper never retains your recordings. Your stored invoices are never sent to any AI provider.</p>
          </div>
          <div className="lv2-faq-item2">
            <h3 className="lv2-faq-q2">Can I cancel anytime?</h3>
            <p className="lv2-faq-a2">Yes. Cancel from inside the app in one tap. You keep access until the end of your billing period. No fees, no questions.</p>
          </div>
          <div className="lv2-faq-item2">
            <h3 className="lv2-faq-q2">Need help?</h3>
            <p className="lv2-faq-a2">Email <a href="mailto:support@invoiceprepper.com" className="lv2-faq-link">support@invoiceprepper.com</a> and we will get back to you.</p>
          </div>
        </div>
      </section>

      {/* 9 — Final CTA */}
      <section className="lv2-final-cta">
        <h2 className="lv2-final-cta-title">Ready to send your first invoice?</h2>
        <p className="lv2-final-cta-sub">Free forever. No credit card. Takes two minutes.</p>
        <button className="lv2-cta" onClick={onEnter}>Start Invoicing Free</button>
      </section>

      {/* Footer */}
      <footer className="lv2-footer">
        <p>
          <a href="#terms" onClick={(e) => { e.preventDefault(); setLegal("terms"); }} className="lv2-footer-link">Terms</a>
          {" · "}
          <a href="#privacy" onClick={(e) => { e.preventDefault(); setLegal("privacy"); }} className="lv2-footer-link">Privacy</a>
        </p>
        <p className="lv2-footer-disclaimer">For personal record-keeping only. Not a substitute for professional accounting or tax advice.</p>
      </footer>

      {legal && <LegalModal type={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}
