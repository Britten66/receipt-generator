import { useState, useEffect, useRef } from "react";
import { Gift, Newspaper, Send } from "lucide-react";
import posthog from "posthog-js";
import LegalModal from "../features/profile/LegalModal";
import ReferralModal from "../features/referrals/ReferralModal";
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
        <span className="mock-status-badge mock-status-sent">
          <Send size={10} strokeWidth={2} />
          Sent
        </span>
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

export default function LandingPage({ onEnter, onEnterPro, onEnterVoice, onSignIn, onSignUp, darkMode, onToggleDark, currency, onCurrencyChange }) {
  const [legal, setLegal] = useState(null);
  const [ctaVariant, setCtaVariant] = useState("control");
  const navRef = useRef(null);
  const refCode = typeof localStorage !== "undefined" ? localStorage.getItem("pending_ref_code") : null;
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [exampleLoading, setExampleLoading] = useState(false);

  async function handleTryMe() {
    if (exampleLoading) return;
    setExampleLoading(true);
    try {
      const { getExamplePDFBlobUrl } = await import("../features/invoices/ReceiptPDF");
      const url = await getExamplePDFBlobUrl();
      window.open(url, "_blank");
    } finally {
      setExampleLoading(false);
    }
  }

  // A/B test: hero CTA copy. Flag key: landing-cta-copy
  // Variants: control ("Start Invoicing Free") vs first-invoice ("Create Your First Invoice")
  useEffect(() => {
    posthog.onFeatureFlags(() => {
      const flag = posthog.getFeatureFlag("landing-cta-copy");
      if (flag === "first-invoice") setCtaVariant("first-invoice");
    });
  }, []);

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
        <div className="lv2-nav-left">
          <button className="dark-toggle" onClick={onToggleDark}>
            {darkMode ? "Light" : "Dark"}
          </button>
        </div>
        <div className="lv2-nav-controls">
          <a className="lv2-nav-gift" href="/blog" target="_blank" rel="noopener noreferrer" aria-label="What's new" title="What's new">
            <Newspaper size={17} strokeWidth={1.75} />
          </a>
          <button className="lv2-nav-gift" onClick={() => setShowReferralModal(true)} aria-label="Refer a friend" title="Refer a friend, you both get 1 month Pro free">
            <Gift size={17} strokeWidth={1.75} />
          </button>
          <select
            className="lv2-currency-select"
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            aria-label="Select currency"
          >
            <option value="CAD">$ CAD</option>
            <option value="USD">$ USD</option>
          </select>
          <button className="lv2-nav-login" onClick={onSignIn}>Sign In</button>
          <button className="lv2-signin" onClick={onSignUp}>Sign Up</button>
        </div>
      </nav>

      <main>
      {refCode && (
        <div className="lv2-ref-banner" role="status">
          <span><strong>You've been invited.</strong> Sign up with code <code>{refCode}</code> to claim 1 month of Pro free.</span>
        </div>
      )}

      {/* 2: Hero: hook + invoice preview */}
      <section className="lv2-hero">
        <div className="lv2-hero-text">
          <p className="lv2-eyebrow">InvoicePrepper</p>
          <h1 className="lv2-title">The invoice generator<br />for people who<br />just want to get paid.</h1>
          <p className="lv2-desc">Create professional invoices, email to clients, and track what's paid; all in one place. Built for independent workers, contractors, and small businesses. No bloat, no learning curve.</p>
          <button className="lv2-cta" onClick={() => {
            posthog.capture("cta_clicked", { variant: ctaVariant, location: "hero" });
            onEnter();
          }}>
            {ctaVariant === "first-invoice" ? "Create Your First Invoice" : "Start Invoicing Free"}
          </button>
          <p className="lv2-sub">Free forever · No credit card required</p>
        </div>

        <div className="lv2-preview-wrap">
          <BorderGlow
            borderRadius={0}
            glowColor={darkMode ? "180 155 50" : "160 138 40"}
            glowIntensity={darkMode ? 1.6 : 1.3}
            glowRadius={48}
            edgeSensitivity={8}
            coneSpread={28}
            fillOpacity={darkMode ? 0.28 : 0.22}
            colors={darkMode ? ["#9098a8", "#D4AF37", "#4dd8e0"] : ["#606878", "#b8942a", "#28b8c0"]}
            backgroundColor="transparent"
            className="lv2-border-glow"
          >
            <div className="lv2-hero-preview" aria-label="Sample invoice preview">
              <MockInvoice />
              <button
                className="lv2-try-me-btn"
                onClick={handleTryMe}
                disabled={exampleLoading}
                aria-label="Open a sample PDF"
              >
                {exampleLoading ? "..." : "See an example"}
              </button>
            </div>
          </BorderGlow>
        </div>
      </section>

      {/* 3: Features */}

      {/* 5: How it works */}
      <section className="lv2-steps">
        <p className="lv2-steps-eyebrow">How it works</p>
        <h2 className="lv2-steps-title">Invoice sent in under 60 seconds</h2>
        <div className="lv2-steps-grid">
          <div className="lv2-step">
            <div className="lv2-step-num">01</div>
            <div className="lv2-step-label">Speak or type your invoice</div>
            <p className="lv2-step-desc">Say what you did and who to bill. AI pulls out the line items, quantities, and amounts automatically.</p>
          </div>
          <div className="lv2-step">
            <div className="lv2-step-num">02</div>
            <div className="lv2-step-label">Review and send</div>
            <p className="lv2-step-desc">Confirm the details, attach your logo, and email a professional PDF directly from the app.</p>
          </div>
          <div className="lv2-step">
            <div className="lv2-step-num">03</div>
            <div className="lv2-step-label">Track every dollar</div>
            <p className="lv2-step-desc">See what is draft, sent, and paid at a glance. Know exactly what is outstanding without opening a spreadsheet.</p>
          </div>
        </div>
      </section>

      {/* 6: Threads break */}
      <div className="lv2-texture-break" aria-hidden="true">
        <Threads
          color={darkMode ? [0.85, 0.72, 0.45] : [0.22, 0.2, 0.18]}
          amplitude={1.0}
          distance={0.2}
          enableMouseInteraction={true}
        />
      </div>

      {/* 7: Pricing */}
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
              <div className="lv2-plan-name">Basic</div>
              <div className="lv2-plan-price">Free</div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 8px" }}>No credit card required</p>
              <ul className="lv2-plan-features">
                <li>Unlimited invoices</li>
                <li>Clean PDF, no watermark</li>
                <li>Download and share link</li>
                <li>Pay Now button on invoices</li>
                <li>Draft, sent, paid tracking</li>
                <li>Dark mode</li>
                <li>No app to install. Works in any browser</li>
                <li>Syncs across desktop and mobile</li>
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
              <button className="lv2-plan-promo-btn" onClick={() => setShowReferralModal(true)} title="Check out our promotion">
                <Gift size={14} strokeWidth={1.75} />
                <span>Check out our promotion</span>
              </button>
              <div className="lv2-plan-name">Pro</div>
              <div className="lv2-plan-price">{currency || "CAD"} $9<span>/mo</span></div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 8px" }}>Billed monthly · Cancel anytime</p>
              <ul className="lv2-plan-features">
                <li style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Everything in Basic</li>
                <li>Email invoices to clients with your logo</li>
                <li>Invoice due dates</li>
                <li>Text AI parsing: describe an invoice, the form fills itself</li>
                <li>Send payment reminders to clients</li>
                <li>CSV export</li>
                <li>Custom dashboard themes</li>
              </ul>
              <button className="lv2-plan-btn lv2-plan-btn-primary" onClick={onEnterPro}>Get Pro</button>
            </div>
          </BorderGlow>

          {/* Voice AI card: teal glow, separate CSS shadow in .lv2-plan-voice */}
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
              <div className="lv2-plan-price">{currency || "CAD"} $12<span>/mo</span></div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 8px" }}>Billed monthly · Cancel anytime</p>
              <ul className="lv2-plan-features">
                <li style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Includes Pro Plan</li>
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
              <button className="lv2-plan-btn lv2-plan-btn-voice" onClick={onEnterVoice}>Get Voice AI</button>
            </div>
          </BorderGlow>

        </div>
      </section>

      {/* 8: FAQ */}
      <section className="lv2-faq-editorial">
        <div className="lv2-faq-left">
          <span className="lv2-faq-eyebrow">Common Questions</span>
          <h2 className="lv2-faq-headline">Simple answers.</h2>
          <p className="lv2-faq-tagline">Everything you need to know before you send your first invoice.</p>
        </div>
        <div className="lv2-faq-right">
          <div className="lv2-faq-item2">
            <h3 className="lv2-faq-q2">Is the free plan really free?</h3>
            <p className="lv2-faq-a2">Yes, forever. No ads, no watermark, no credit card. Built to solve the pain points other tools create. Just invoices.</p>
          </div>
          <div className="lv2-faq-item2">
            <h3 className="lv2-faq-q2">Can I download my invoices as PDFs?</h3>
            <p className="lv2-faq-a2">Yes, the second you hit generate. Built for convenience. And if something feels off, let us know at support@invoiceprepper.com, feedback helps us build better and smarter.</p>
          </div>
          <div className="lv2-faq-item2">
            <h3 className="lv2-faq-q2">Can I email invoices directly to clients?</h3>
            <p className="lv2-faq-a2">Pro users can send directly from the dashboard with their business name shown in the email. Free users can use the mobile share button to send via any app on their phone, same result, no cost.</p>
          </div>
          <div className="lv2-faq-item2">
            <h3 className="lv2-faq-q2">How do I track which invoices are paid?</h3>
            <p className="lv2-faq-a2">Every invoice has a status: Draft, Sent, Paid, or Voided. Your dashboard shows outstanding balance and total revenue so you always know where you stand.</p>
          </div>
          <div className="lv2-faq-item2">
            <h3 className="lv2-faq-q2">What is the Voice AI plan?</h3>
            <p className="lv2-faq-a2">Say your invoice out loud and the AI fills in your client, line items, and prices automatically. It uses your invoice history to suggest your regular clients and rates. You always review before sending.</p>
          </div>
          <div className="lv2-faq-item2">
            <h3 className="lv2-faq-q2">Can I export my invoices?</h3>
            <p className="lv2-faq-a2">Yes, on Pro and above. Download all your invoices as a CSV directly from your account settings. Opens in Excel and Google Sheets with all line items included.</p>
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

      {/* 9: Final CTA */}
      <section className="lv2-final-cta">
        <h2 className="lv2-final-cta-title">Ready to send your first invoice?</h2>
        <p className="lv2-final-cta-sub">Free forever. No credit card. Takes two minutes.</p>
        <button className="lv2-cta" onClick={onEnter}>Start Invoicing Free</button>
      </section>

      </main>

      {/* Footer */}
      <footer className="lv2-footer">
        <div className="lv2-footer-top">
          <div className="lv2-footer-brand">
            <div className="lv2-footer-wordmark">InvoicePrepper</div>
            <p className="lv2-footer-tagline">Invoicing that gets out of your way.</p>
          </div>
          <div className="lv2-footer-cols">
            <div className="lv2-footer-col">
              <h3 className="lv2-footer-h">For</h3>
              <a href="/invoice-for-freelancers" className="lv2-footer-link">Freelancers</a>
              <a href="/invoice-for-contractors" className="lv2-footer-link">Contractors</a>
              <a href="/invoice-for-designers" className="lv2-footer-link">Designers</a>
              <a href="/invoice-for-photographers" className="lv2-footer-link">Photographers</a>
              <a href="/invoice-for-tutors" className="lv2-footer-link">Tutors</a>
              <a href="/invoice-for-personal-trainers" className="lv2-footer-link">Personal trainers</a>
            </div>
            <div className="lv2-footer-col">
              <h3 className="lv2-footer-h">Trades</h3>
              <a href="/invoice-for-cleaners" className="lv2-footer-link">Cleaners</a>
              <a href="/invoice-for-electricians" className="lv2-footer-link">Electricians</a>
              <a href="/invoice-for-plumbers" className="lv2-footer-link">Plumbers</a>
              <a href="/invoice-for-painters" className="lv2-footer-link">Painters</a>
              <a href="/invoice-for-landscapers" className="lv2-footer-link">Landscapers</a>
              <a href="/invoice-for-handymen" className="lv2-footer-link">Handymen</a>
            </div>
            <div className="lv2-footer-col">
              <h3 className="lv2-footer-h">Resources</h3>
              <a href="/free-invoice-generator" className="lv2-footer-link">Free invoice generator</a>
              <a href="/voice-invoicing" className="lv2-footer-link">Voice invoicing</a>
              <a href="/how-to-invoice-clients" className="lv2-footer-link">How to invoice clients</a>
              <a href="/invoice-simple-alternative" className="lv2-footer-link">Vs Invoice Simple</a>
              <a href="/blog" className="lv2-footer-link">Blog</a>
            </div>
            <div className="lv2-footer-col">
              <h3 className="lv2-footer-h">Company</h3>
              <a href="/terms" className="lv2-footer-link">Terms</a>
              <a href="/privacy" className="lv2-footer-link">Privacy</a>
            </div>
          </div>
        </div>
        <div className="lv2-footer-bottom">
          <span className="lv2-footer-copy">© {new Date().getFullYear()} InvoicePrepper</span>
          <span className="lv2-footer-disclaimer">For personal record-keeping. Not a substitute for professional accounting or tax advice.</span>
        </div>
      </footer>

      {legal && <LegalModal type={legal} onClose={() => setLegal(null)} />}

      {showReferralModal && (
        <ReferralModal onClose={() => setShowReferralModal(false)} onSignUp={onSignUp} />
      )}

    </div>
  );
}
