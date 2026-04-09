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
      <Accordion title="1. Acceptance">
        By accessing or using Invoice Prepper (the "Service"), you agree to be bound by these Terms. Continued use after any update constitutes acceptance.
      </Accordion>
      <Accordion title="2. Description of Service">
        Invoice Prepper is an invoice creation and tracking tool. It provides PDF generation, invoice tracking, and optional client-facing email delivery. It is not accounting software, legal advice, or a licensed financial service.
      </Accordion>
      <Accordion title="3. Eligibility">
        You must be at least 16 years old to use the Service and have the legal capacity to enter into a binding agreement in your jurisdiction.
      </Accordion>
      <Accordion title="4. Your Account">
        You are responsible for maintaining your account credentials and all activity under your account. Provide accurate information and do not share your account with others.
      </Accordion>
      <Accordion title="5. Your Data">
        You retain full ownership of all data you enter. You grant the operator a limited licence to store and process it solely to provide the Service. This licence ends when you delete your account.
      </Accordion>
      <Accordion title="6. Tax Responsibility">
        Invoice Prepper is a record-keeping tool only. It does not calculate, collect, file, or remit taxes. You are solely responsible for all tax obligations applicable to your business. Consult a qualified professional for advice.
      </Accordion>
      <Accordion title="7. Prohibited Use">
        You may not use the Service to generate fraudulent invoices, impersonate anyone, harass or deceive clients, or engage in any illegal activity.
      </Accordion>
      <Accordion title="8. Paid Plans and Billing">
        <p style={{ marginBottom: 6 }}>Pro and Voice AI subscriptions are billed monthly via Stripe. The price is shown at checkout before you confirm.</p>
        <p style={{ marginBottom: 6 }}><strong>Auto-renewal:</strong> Subscriptions renew monthly unless cancelled. Cancel any time from the Billing section. Access continues until the end of the paid period.</p>
        <p style={{ marginBottom: 6 }}><strong>Refunds:</strong> No refunds for partial billing periods, unless mandatory under applicable consumer protection law.</p>
        <p><strong>Price changes:</strong> Prices may change with 30 days notice by email. Continued use after the effective date constitutes acceptance.</p>
      </Accordion>
      <Accordion title="8a. AI Features (Voice AI Plan)">
        <p style={{ marginBottom: 6 }}>Voice and text AI parsing is powered by Groq, Inc. Your audio or text is transmitted to Groq for processing and deleted immediately after.</p>
        <p style={{ marginBottom: 6 }}>Only content you actively submit is sent to Groq. Your stored invoices and account credentials are never shared. Usage is limited to 20 parses per day.</p>
        <p>AI-generated fields are a convenience only. Always review before sending to clients.</p>
      </Accordion>
      <Accordion title="9. Electronic Communications">
        By creating an account you consent to transactional emails (password resets, billing confirmations). You may not use the Service to send unsolicited commercial messages.
      </Accordion>
      <Accordion title="10. Intellectual Property">
        The Service, its design and code are owned by the operator. Your invoice content and business data remain your property.
      </Accordion>
      <Accordion title="11. Indemnification">
        You agree to indemnify the operator from claims arising from your use of the Service, violation of these Terms, invoices you create or send, or tax and legal obligations from your business activities.
      </Accordion>
      <Accordion title="12. No Warranties">
        The Service is provided "as is" without warranties of any kind, including merchantability, fitness for a particular purpose, or uninterrupted availability.
      </Accordion>
      <Accordion title="13. Limitation of Liability">
        <p style={{ marginBottom: 6 }}>The operator is not liable for indirect, incidental, or consequential damages including lost revenue, missed payments, or data loss.</p>
        <p>Total liability is capped at the greater of amounts you paid in the three months prior to the claim or CAD $50.</p>
      </Accordion>
      <Accordion title="14. Termination">
        The operator may suspend or terminate your account for violations of these Terms. You may delete your account at any time. Key clauses survive termination.
      </Accordion>
      <Accordion title="15–17. Disputes, Governing Law, Severability">
        <p style={{ marginBottom: 6 }}>Contact support@invoiceprepper.com first to resolve disputes informally for 30 days before formal proceedings.</p>
        <p style={{ marginBottom: 6 }}>Governed by the laws of Canada. Your mandatory consumer protection rights are not affected.</p>
        <p>If any provision is unenforceable, remaining provisions continue in full effect.</p>
      </Accordion>
      <Accordion title="18. Contact">
        Questions: <a href="mailto:support@invoiceprepper.com" style={{ color: "var(--accent)" }}>support@invoiceprepper.com</a>
      </Accordion>
    </>
  );
}

function Privacy() {
  return (
    <>
      <Accordion title="1. Who We Are">
        Invoice Prepper is operated by an individual based in Canada. This policy applies to all users regardless of location.
      </Accordion>
      <Accordion title="2. What We Collect">
        <p style={{ marginBottom: 6 }}><strong>Account:</strong> email and hashed password. Plaintext passwords are never stored.</p>
        <p style={{ marginBottom: 6 }}><strong>Profile:</strong> business name, address, contact details, payment link, and logo -- only what you choose to enter.</p>
        <p style={{ marginBottom: 6 }}><strong>Invoices:</strong> client names, amounts, line items, dates, and notes.</p>
        <p style={{ marginBottom: 6 }}><strong>Billing:</strong> Stripe handles payment processing. We receive only a customer ID and subscription status -- never your card number or bank details.</p>
        <p style={{ marginBottom: 6 }}><strong>Usage logs:</strong> IP address and request timestamps for security and debugging only. Not sold or used for advertising.</p>
        <p><strong>AI data (Voice AI only):</strong> input submitted for parsing is sent to Groq and deleted immediately after. We store only a daily count for rate-limiting. Your stored invoices are never sent to Groq.</p>
      </Accordion>
      <Accordion title="3. How We Use Your Data">
        Solely to provide the Service: storing invoices, sending transactional emails, and (on paid plans) sending invoices to clients. On Voice AI, past invoice history is used locally to personalise AI results -- never shared externally. We do not use your data for advertising or behavioural profiling.
      </Accordion>
      <Accordion title="4. Legal Basis (EEA / UK Users)">
        Processing is based on (a) contract performance, (b) legitimate interests for security and fraud prevention, and (c) consent for optional features. You may withdraw consent at any time.
      </Accordion>
      <Accordion title="5. Third-Party Processors">
        <p style={{ marginBottom: 6 }}><strong>Supabase</strong> -- database and auth, US servers, SOC 2 Type II.</p>
        <p style={{ marginBottom: 6 }}><strong>Stripe</strong> -- payments, PCI-DSS Level 1.</p>
        <p style={{ marginBottom: 6 }}><strong>Resend</strong> -- transactional email delivery.</p>
        <p style={{ marginBottom: 6 }}><strong>Cloudflare</strong> -- CDN and security.</p>
        <p><strong>Groq, Inc.</strong> -- AI parsing (Voice AI plan only). No stored invoice data is sent to Groq. We do not sell your data to any third party.</p>
      </Accordion>
      <Accordion title="6. International Data Transfers">
        Data may be processed in Canada and the United States. For EEA/UK users, transfers are made under standard contractual clauses. For all other users, use of the Service constitutes consent to this transfer.
      </Accordion>
      <Accordion title="7. Your Rights">
        You can access, correct, export, or delete your data at any time. Canadian users: PIPEDA. EU/UK users: GDPR including portability and objection rights. California users: CCPA. Email <a href="mailto:support@invoiceprepper.com" style={{ color: "var(--accent)" }}>support@invoiceprepper.com</a> -- we respond within 30 days.
      </Accordion>
      <Accordion title="8. Data Retention">
        Data is retained while your account is active. Request deletion at any time -- we delete within 30 days. Billing records may be retained as required by Stripe and applicable regulations.
      </Accordion>
      <Accordion title="9. Security">
        All data is encrypted in transit (TLS 1.2+) and at rest. Row-level security ensures users can only access their own data. Use a strong, unique password.
      </Accordion>
      <Accordion title="10. Cookies">
        Only functional cookies for authentication (session token). No tracking, advertising, or analytics cookies.
      </Accordion>
      <Accordion title="11–13. Children, Changes, Contact">
        <p style={{ marginBottom: 6 }}>The Service is not directed at anyone under 16. Contact us to delete a minor's account.</p>
        <p style={{ marginBottom: 6 }}>This policy may be updated. Material changes will be notified by email where practicable.</p>
        <p>Questions: <a href="mailto:support@invoiceprepper.com" style={{ color: "var(--accent)" }}>support@invoiceprepper.com</a>. EU/UK residents may also contact their local data protection authority.</p>
      </Accordion>
    </>
  );
}
