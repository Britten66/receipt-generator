import { useState } from "react";

function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: "1px solid var(--border-light)" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "none", border: "none", padding: "10px 0", cursor: "pointer",
          color: "var(--text)", fontSize: 12, fontWeight: 600, textAlign: "left",
        }}
      >
        {title}
        <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ fontSize: 11, lineHeight: 1.7, color: "var(--text-dim)", paddingBottom: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function LegalModal({ type, onClose }) {
  const isTerms = type === "terms";

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-header">
          <span className="modal-title">{isTerms ? "Terms of Service" : "Privacy Policy"}</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={onClose}>&#x2715;</button>
        </div>
        <div className="modal-body" style={{ overflowY: "auto", flex: 1 }}>
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 12 }}>
            Last updated: April 2026. Operated by an individual in Canada.
          </p>
          {isTerms ? <Terms /> : <Privacy />}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Terms() {
  return (
    <>
      <Accordion title="About the Service">
        <p style={{ marginBottom: 6 }}>By using Invoice Prepper you agree to these Terms. Continued use after any update constitutes acceptance. You must be at least 16 years old and have legal capacity to enter a binding agreement.</p>
        <p>Invoice Prepper is an invoice creation and tracking tool, not accounting software, legal advice, or a licensed financial service. Nothing in the app constitutes professional financial or tax advice.</p>
      </Accordion>

      <Accordion title="Your Account & Data">
        <p style={{ marginBottom: 6 }}>You are responsible for your account credentials and all activity under your account. Provide accurate information and do not share your account.</p>
        <p>You retain full ownership of all data you enter. The operator stores and processes it only to provide the Service. This licence ends when you delete your account.</p>
      </Accordion>

      <Accordion title="Taxes & Acceptable Use">
        <p style={{ marginBottom: 6 }}><strong>Taxes:</strong> Invoice Prepper does not calculate, collect, file, or remit taxes. Tax fields are for your own record-keeping. You are solely responsible for all tax obligations in your jurisdiction. Consult a qualified professional.</p>
        <p><strong>Prohibited use:</strong> You may not use the Service to generate fraudulent invoices, impersonate anyone, harass or deceive clients, or engage in any illegal activity.</p>
      </Accordion>

      <Accordion title="Billing & AI Features">
        <p style={{ marginBottom: 6 }}><strong>Subscriptions:</strong> Pro and Voice AI plans are billed monthly via Stripe. Price is shown at checkout. Subscriptions auto-renew unless cancelled. Cancel any time from the Billing section. Access continues until the end of the paid period.</p>
        <p style={{ marginBottom: 6 }}><strong>Refunds:</strong> No refunds for partial billing periods, unless mandatory under your local consumer protection law. Price changes require 30 days notice by email.</p>
        <p style={{ marginBottom: 6 }}><strong>Voice AI:</strong> Parsing is powered by Groq, Inc. Only content you actively submit is sent to Groq and deleted immediately after. Your stored invoices and credentials are never shared. Always review AI output before sending to clients.</p>
        <p>By creating an account you consent to transactional emails (password resets, billing confirmations). You may not use the Service to send unsolicited commercial messages.</p>
      </Accordion>

      <Accordion title="Legal Protections & Contact">
        <p style={{ marginBottom: 6 }}><strong>Intellectual property:</strong> The Service, its design and code are owned by the operator. Your invoice content remains your property.</p>
        <p style={{ marginBottom: 6 }}><strong>Warranties:</strong> The Service is provided "as is" without warranties of any kind.</p>
        <p style={{ marginBottom: 6 }}><strong>Liability:</strong> The operator is not liable for indirect or consequential damages. Total liability is capped at the greater of amounts you paid in the prior three months or CAD $50.</p>
        <p style={{ marginBottom: 6 }}><strong>Termination:</strong> The operator may suspend accounts for violations. You may delete your account at any time.</p>
        <p style={{ marginBottom: 6 }}><strong>Disputes:</strong> Contact <a href="mailto:support@invoiceprepper.com" style={{ color: "var(--accent)" }}>support@invoiceprepper.com</a> first to resolve informally (30 days). Governed by Canadian law. Your mandatory consumer protection rights are not affected.</p>
        <p>Questions: <a href="mailto:support@invoiceprepper.com" style={{ color: "var(--accent)" }}>support@invoiceprepper.com</a></p>
      </Accordion>
    </>
  );
}

function Privacy() {
  return (
    <>
      <Accordion title="What We Collect">
        <p style={{ marginBottom: 6 }}>Invoice Prepper is operated by an individual based in Canada. This policy applies to all users globally.</p>
        <p style={{ marginBottom: 6 }}><strong>Account:</strong> email and hashed password. Plaintext passwords are never stored.</p>
        <p style={{ marginBottom: 6 }}><strong>Profile:</strong> business name, address, contact details, payment link, and logo (only what you choose to enter).</p>
        <p style={{ marginBottom: 6 }}><strong>Invoices:</strong> client names, amounts, line items, dates, and notes.</p>
        <p style={{ marginBottom: 6 }}><strong>Billing:</strong> Stripe handles payment processing. We receive only a customer ID and subscription status, never your card number or bank details.</p>
        <p style={{ marginBottom: 6 }}><strong>Usage logs:</strong> IP address and request timestamps for security and debugging only. Not sold or used for advertising.</p>
        <p><strong>AI data (Voice AI only):</strong> input submitted for parsing is sent to Groq and deleted immediately after. We store only a daily count for rate-limiting. Your stored invoices are never sent to Groq.</p>
      </Accordion>

      <Accordion title="How We Use It">
        <p style={{ marginBottom: 6 }}>Solely to provide the Service: storing invoices, sending transactional emails, and (on paid plans) sending invoices to your clients. On Voice AI, past invoice history is used locally to personalise AI results and is never shared externally.</p>
        <p>We do not use your data for advertising or behavioural profiling. For EEA/UK users, processing is based on contract performance, legitimate interests (security), and consent for optional features.</p>
      </Accordion>

      <Accordion title="Third Parties and Data Transfers">
        <p style={{ marginBottom: 6 }}><strong>Supabase</strong> (database and auth, US, SOC 2 Type II), <strong>Stripe</strong> (payments, PCI-DSS Level 1), <strong>Resend</strong> (email delivery), <strong>Cloudflare</strong> (CDN and security), <strong>Groq, Inc.</strong> (Voice AI parsing only), <strong>PostHog</strong> (product analytics, EU servers), <strong>Sentry</strong> (error monitoring, US).</p>
        <p style={{ marginBottom: 6 }}>We do not sell your data to any third party or share it with advertisers.</p>
        <p>Data may be processed in Canada and the United States. EEA/UK transfers are made under standard contractual clauses.</p>
      </Accordion>

      <Accordion title="Your Rights and Data Retention">
        <p style={{ marginBottom: 6 }}>You can access, correct, export, or delete your data at any time. Canadian users: PIPEDA. EU/UK users: GDPR (including portability and objection rights). California users: CCPA.</p>
        <p style={{ marginBottom: 6 }}>Data is retained while your account is active. Request deletion and we will delete within 30 days. Billing records may be retained as required by Stripe and applicable regulations.</p>
        <p>Email <a href="mailto:support@invoiceprepper.com" style={{ color: "var(--accent)" }}>support@invoiceprepper.com</a> to exercise any of these rights. We respond within 30 days.</p>
      </Accordion>

      <Accordion title="Security, Cookies and Contact">
        <p style={{ marginBottom: 6 }}><strong>Security:</strong> All data is encrypted in transit (TLS 1.2+) and at rest. Row-level security ensures users can only access their own data.</p>
        <p style={{ marginBottom: 6 }}><strong>Cookies:</strong> We use functional cookies for authentication (session token) and analytics cookies via PostHog to understand how the app is used. No advertising or third-party tracking cookies are used. You can opt out of analytics by contacting us.</p>
        <p style={{ marginBottom: 6 }}><strong>Children:</strong> The Service is not directed at anyone under 16. Contact us to remove a minor's account.</p>
        <p>Questions or data requests: <a href="mailto:support@invoiceprepper.com" style={{ color: "var(--accent)" }}>support@invoiceprepper.com</a>. EU/UK residents may also contact their local data protection authority.</p>
      </Accordion>
    </>
  );
}
