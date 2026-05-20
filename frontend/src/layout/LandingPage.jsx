import { useState, useEffect, useRef } from "react";
import { Gift, Compass, Sparkles, Check, X, Minus, BookOpen, Mail, HelpCircle, LifeBuoy, MessageSquare } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import posthog from "posthog-js";
import LegalModal from "../features/profile/LegalModal";
import ReferralModal from "../features/referrals/ReferralModal";
import BorderGlow from "./BorderGlow";
import Threads from "./Threads";
import "./LandingPage.css";

export default function LandingPage({ onEnter, onEnterPro, onEnterVoice, onSignIn, onSignUp, darkMode, onToggleDark, currency, onCurrencyChange }) {
  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [legal, setLegal] = useState(null);
  const [ctaVariant, setCtaVariant] = useState("control");
  const refCode = typeof localStorage !== "undefined" ? localStorage.getItem("pending_ref_code") : null;
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [exampleLoading, setExampleLoading] = useState(false);
  const [examplePdfUrl, setExamplePdfUrl] = useState(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const navSentinelRef = useRef(null);

  async function handleTryMe() {
    if (exampleLoading) return;
    setExampleLoading(true);
    try {
      const { getExamplePDFBlobUrl } = await import("../features/invoices/ReceiptPDF");
      const url = await getExamplePDFBlobUrl();
      setExamplePdfUrl(url);
    } finally {
      setExampleLoading(false);
    }
  }

  function closeExamplePdf() {
    if (examplePdfUrl) URL.revokeObjectURL(examplePdfUrl);
    setExamplePdfUrl(null);
  }

  useEffect(() => {
    if (!examplePdfUrl) return;
    function onKey(e) { if (e.key === "Escape") closeExamplePdf(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [examplePdfUrl]);

  // A/B test: hero CTA copy. Flag key: landing-cta-copy
  // Variants: control ("Start Invoicing Free") vs first-invoice ("Create Your First Invoice")
  useEffect(() => {
    posthog.onFeatureFlags(() => {
      const flag = posthog.getFeatureFlag("landing-cta-copy");
      if (flag === "first-invoice") setCtaVariant("first-invoice");
    });
  }, []);

  // Stripe-style nav: transparent at top, solid once scrolled past the sentinel.
  // IntersectionObserver fires once per state change (not per scroll frame).
  useEffect(() => {
    const sentinel = navSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNavScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-v2">

      {/* Sentinel: nav goes solid the moment this scrolls out of view */}
      <div ref={navSentinelRef} className="lv2-nav-sentinel" aria-hidden="true" />

      <nav className={`lv2-topbar${navScrolled ? " lv2-topbar-scrolled" : ""}`} aria-label="Primary">
        <div className="lv2-topbar-inner">
          <div className="lv2-nav-left">
            <button className="dark-toggle" onClick={onToggleDark}>
              {darkMode ? "Light" : "Dark"}
            </button>
          </div>
          <div className="lv2-nav-controls">
            {/* About menu: mission, contact, FAQ */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="lv2-nav-gift"
                  aria-label="About InvoicePrepper"
                  title="About"
                >
                  <Compass size={17} strokeWidth={1.75} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="lv2-nav-menu"
                  sideOffset={6}
                  align="end"
                >
                  <DropdownMenu.Item asChild>
                    <a className="lv2-nav-menu-item" href="/blog" target="_blank" rel="noopener noreferrer">
                      <BookOpen size={14} strokeWidth={1.75} />
                      <span>Our story</span>
                    </a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <a
                      className="lv2-nav-menu-item"
                      href="mailto:support@invoiceprepper.com?subject=Hello"
                    >
                      <Mail size={14} strokeWidth={1.75} />
                      <span>Contact us</span>
                    </a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <a className="lv2-nav-menu-item" href="#faq">
                      <HelpCircle size={14} strokeWidth={1.75} />
                      <span>FAQ</span>
                    </a>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Updates menu: changelog (top), support, feedback. */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="lv2-nav-gift"
                  aria-label="Updates"
                  title="Updates and support"
                >
                  <Sparkles size={17} strokeWidth={1.75} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="lv2-nav-menu"
                  sideOffset={6}
                  align="end"
                >
                  <DropdownMenu.Item asChild>
                    <a
                      className="lv2-nav-menu-item"
                      href="/changelog"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Sparkles size={14} strokeWidth={1.75} />
                      <span>Changelog</span>
                    </a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <a
                      className="lv2-nav-menu-item"
                      href="mailto:support@invoiceprepper.com?subject=Support%20request"
                    >
                      <LifeBuoy size={14} strokeWidth={1.75} />
                      <span>Support email</span>
                    </a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <a
                      className="lv2-nav-menu-item"
                      href="https://tally.so/r/2EJZRM"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageSquare size={14} strokeWidth={1.75} />
                      <span>Send feedback</span>
                    </a>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
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
              <option value="GBP">£ GBP</option>
              <option value="EUR">€ EUR</option>
              <option value="AUD">$ AUD</option>
              <option value="INR">₹ INR</option>
            </select>
            <button className="lv2-nav-login" onClick={onSignIn}>Sign In</button>
            <button className="lv2-signin" onClick={onSignUp}>Sign Up</button>
          </div>
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
            glowColor={darkMode ? "180 155 50" : "25 10 12"}
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
              <video
                className="lv2-hero-video"
                src="/hero.mp4"
                poster="/hero-poster.jpg"
                autoPlay={!prefersReducedMotion}
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="Voice to invoice demo"
                onLoadedMetadata={(e) => { e.currentTarget.playbackRate = 0.75; }}
              />
              <button
                className="lv2-try-me-btn"
                onClick={handleTryMe}
                disabled={exampleLoading}
                aria-label="Open a sample PDF"
              >
                {exampleLoading ? "..." : "Example"}
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
            <div className="lv2-step-label">Fill in your invoice</div>
            <p className="lv2-step-desc">Enter your client, line items, and amounts in a clean simple form. On Pro, describe the job and AI fills it in for you.</p>
          </div>
          <div className="lv2-step">
            <div className="lv2-step-num">02</div>
            <div className="lv2-step-label">Download or send</div>
            <p className="lv2-step-desc">Get a professional PDF instantly. Share the link, download it, or email it directly to your client from the app.</p>
          </div>
          <div className="lv2-step">
            <div className="lv2-step-num">03</div>
            <div className="lv2-step-label">Track what is paid</div>
            <p className="lv2-step-desc">Every invoice shows Draft, Sent, or Paid. See your outstanding balance at a glance without touching a spreadsheet.</p>
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
              <div className="lv2-plan-price">$9<span>/mo</span></div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 8px" }}>Billed monthly in CAD · Cancel anytime</p>
              <ul className="lv2-plan-features">
                <li style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Everything in Basic</li>
                <li>Email invoices to clients with your logo</li>
                <li>Send payment reminders to clients</li>
                <li>CSV export</li>
                <li>Custom dashboard themes</li>
                <li className="lv2-plan-feature-voice">Text AI parsing: describe an invoice, the form fills itself</li>
                <li className="lv2-plan-feature-voice">AI remembers your regular clients and rates</li>
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
              <div className="lv2-plan-price">$12<span>/mo</span></div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 8px" }}>Billed monthly in CAD · Cancel anytime</p>
              <ul className="lv2-plan-features">
                <li style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Includes Pro Plan</li>
                <li>Works on mobile, hands-free</li>
                <li>Create invoices on the fly, anywhere</li>
                <li className="lv2-plan-feature-voice">Speak your invoice, AI fills it in</li>
                <li className="lv2-plan-feature-voice">Detects line items, prices, and clients</li>
                <li className="lv2-plan-feature-voice">Remembers your regular clients and rates</li>
                <li className="lv2-plan-feature-voice">Smart pricing: AI suggests rates from your history</li>
                <li className="lv2-plan-feature-voice">Translate invoices into your client's language</li>
                <li className="lv2-plan-feature-voice">First access to new AI features</li>
              </ul>
              <button className="lv2-plan-btn lv2-plan-btn-voice" onClick={onEnterVoice}>Get Voice AI</button>
            </div>
          </BorderGlow>

        </div>
      </section>

      {/* Compare: right under tier cards */}
      <section className="lv2-compare" style={{ position: "relative", overflow: "hidden" }}>
        <div className="lv2-compare-threads" aria-hidden="true">
          <Threads
            color={darkMode ? [0.85, 0.72, 0.45] : [0.58, 0.54, 0.48]}
            amplitude={0.5}
            distance={0.3}
            enableMouseInteraction={false}
          />
        </div>
        <p className="lv2-compare-eyebrow">How we compare</p>
        <h2 className="lv2-compare-title">What other apps charge for. Plus AI they don't have.</h2>
        <div className="lv2-compare-wrap">
          <table className="lv2-compare-table">
            <thead>
              <tr>
                <th className="lv2-cth-feature"><span className="lv2-sr-only">Feature</span></th>
                <th className="lv2-cth-basic">
                  <button className="lv2-cth-btn lv2-cth-btn-basic" onClick={onEnter}>Basic</button>
                </th>
                <th className="lv2-cth-pro">
                  <button className="lv2-cth-btn lv2-cth-btn-pro" onClick={onEnterPro}>Pro</button>
                </th>
                <th className="lv2-cth-voice">
                  <button className="lv2-cth-btn lv2-cth-btn-voice" onClick={onEnterVoice}>Voice AI</button>
                </th>
                <th className="lv2-cth-wave">Other apps</th>
              </tr>
              <tr className="lv2-cth-price">
                <td></td>
                <td className="lv2-cth-basic">Free</td>
                <td className="lv2-cth-pro">$9 / mo</td>
                <td className="lv2-cth-voice">$12 / mo</td>
                <td className="lv2-cth-wave">$15+ / mo</td>
              </tr>
            </thead>
            <tbody>
              {/* Universal-feature row: ALL tiers and competitors do this.
                  Establishes that we are a real product, not a stripped trial. */}
              <tr>
                <td>Unlimited invoices, no caps</td>
                <td className="lv2-ct-basic"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-pro"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-voice"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-wave"><Check size={13} strokeWidth={1.5} /></td>
              </tr>
              {/* Pro essentials at price parity with competitors. The kicker is
                  the header price row: same features for $9 vs their $15+. */}
              <tr>
                <td>Email invoices to clients with your logo</td>
                <td className="lv2-ct-no"><Minus size={14} strokeWidth={2} /></td>
                <td className="lv2-ct-pro"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-voice"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-wave"><Check size={13} strokeWidth={1.5} /></td>
              </tr>
              <tr>
                <td>Send payment reminders to clients</td>
                <td className="lv2-ct-no"><Minus size={14} strokeWidth={2} /></td>
                <td className="lv2-ct-pro"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-voice"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-wave"><Check size={13} strokeWidth={1.5} /></td>
              </tr>
              {/* AI rows: the real moat. Verified ✗ on competitors. */}
              <tr>
                <td>AI text parsing: describe, AI fills</td>
                <td className="lv2-ct-no"><Minus size={14} strokeWidth={2} /></td>
                <td className="lv2-ct-pro"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-voice"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-x"><X size={15} strokeWidth={2.5} /></td>
              </tr>
              <tr>
                <td>AI learns from your invoices and remembers your details</td>
                <td className="lv2-ct-no"><Minus size={14} strokeWidth={2} /></td>
                <td className="lv2-ct-pro"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-voice"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-x"><X size={15} strokeWidth={2.5} /></td>
              </tr>
              {/* Pro exclusive: the viral growth perk. Voice subscribers already
                  have more than the Pro reward, so it doesn't apply at that tier. */}
              <tr>
                <td>Refer a friend, both get a free month of Pro</td>
                <td className="lv2-ct-no"><Minus size={14} strokeWidth={2} /></td>
                <td className="lv2-ct-pro"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-no"><Minus size={14} strokeWidth={2} /></td>
                <td className="lv2-ct-x"><X size={15} strokeWidth={2.5} /></td>
              </tr>
              {/* Voice AI exclusives: the four differentiators that justify $12.
                  Audio input via Whisper, uncapped daily parsing (Pro is 15/day),
                  smart pricing suggestions, and client-language translation. */}
              <tr>
                <td>Voice AI: speak invoices hands-free, anywhere</td>
                <td className="lv2-ct-no"><Minus size={14} strokeWidth={2} /></td>
                <td className="lv2-ct-no"><Minus size={14} strokeWidth={2} /></td>
                <td className="lv2-ct-voice"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-x"><X size={15} strokeWidth={2.5} /></td>
              </tr>
              <tr>
                <td>Unlimited daily AI parses for high-volume work</td>
                <td className="lv2-ct-no"><Minus size={14} strokeWidth={2} /></td>
                <td className="lv2-ct-no"><Minus size={14} strokeWidth={2} /></td>
                <td className="lv2-ct-voice"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-x"><X size={15} strokeWidth={2.5} /></td>
              </tr>
              <tr>
                <td>Smart pricing: AI suggests rates from your history</td>
                <td className="lv2-ct-no"><Minus size={14} strokeWidth={2} /></td>
                <td className="lv2-ct-no"><Minus size={14} strokeWidth={2} /></td>
                <td className="lv2-ct-voice"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-x"><X size={15} strokeWidth={2.5} /></td>
              </tr>
              <tr>
                <td>Translate invoices into your client's language</td>
                <td className="lv2-ct-no"><Minus size={14} strokeWidth={2} /></td>
                <td className="lv2-ct-no"><Minus size={14} strokeWidth={2} /></td>
                <td className="lv2-ct-voice"><Check size={16} strokeWidth={3} /></td>
                <td className="lv2-ct-x"><X size={15} strokeWidth={2.5} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 8: FAQ */}

      <section id="faq" className="lv2-faq-editorial">
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

              <a href="/blog" className="lv2-footer-link">Our story</a>
              <a href="/changelog" className="lv2-footer-link">What's new</a>
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

      {examplePdfUrl && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", flexDirection: "column", background: "#000", paddingTop: "env(safe-area-inset-top)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "var(--surface)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>Example Invoice</span>
            <button onClick={closeExamplePdf} style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", background: "none", border: "1px solid var(--border)", color: "var(--text-dim)", padding: "4px 12px", cursor: "pointer" }}>Close</button>
          </div>
          <iframe src={examplePdfUrl} title="Example Invoice" style={{ flex: 1, border: "none", width: "100%" }} />
        </div>
      )}

      {showReferralModal && (
        <ReferralModal onClose={() => setShowReferralModal(false)} onSignUp={onSignUp} />
      )}

    </div>
  );
}
