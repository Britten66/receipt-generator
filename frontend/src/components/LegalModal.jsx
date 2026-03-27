export default function LegalModal({ type, onClose }) {
  const isTerms = type === "terms";

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520, maxHeight: "80vh", overflowY: "auto" }}>
        <div className="modal-header">
          <span className="modal-title">{isTerms ? "Terms of Service" : "Privacy Policy"}</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-dim)" }}>
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
      <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 16 }}>Last updated: March 2025</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>1. Acceptance</h3>
      <p>By accessing or using Keep Track ("Service"), you agree to these Terms. If you do not agree, do not use the Service.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>2. Description</h3>
      <p>Keep Track is a receipt and invoice management tool for freelancers and small businesses. We provide PDF generation, invoice tracking, and related features. The Service is provided "as is" without warranty of any kind.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>3. Your Account</h3>
      <p>You are responsible for maintaining the security of your account credentials. You must provide accurate information and keep it updated. You may not share your account or use the Service for unlawful purposes.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>4. Your Data</h3>
      <p>You retain ownership of all data you enter into the Service (invoices, client names, amounts). You grant us a limited licence to store and process that data solely to provide the Service to you.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>5. Prohibited Use</h3>
      <p>You may not use the Service to generate fraudulent invoices, impersonate another person or business, or engage in any activity that violates applicable law.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>6. Paid Plans</h3>
      <p>Pro plan subscriptions are billed monthly via Stripe. You may cancel at any time; cancellation takes effect at the end of the current billing period. We do not offer refunds for partial periods except where required by law.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>7. Limitation of Liability</h3>
      <p>To the maximum extent permitted by law, Keep Track is not liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability to you shall not exceed the amounts you paid us in the 3 months preceding the claim.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>8. Changes</h3>
      <p>We may update these Terms. Continued use after changes constitutes acceptance. We will notify registered users of material changes by email.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>9. Governing Law</h3>
      <p>These Terms are governed by the laws of Nova Scotia, Canada. Disputes shall be resolved in the courts of Nova Scotia.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>10. Contact</h3>
      <p>Questions? Contact us through the app or at the email address on file with your account.</p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 16 }}>Last updated: March 2025 · Applies to Canadian users under PIPEDA</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>1. What We Collect</h3>
      <p><strong>Account data:</strong> email address, password (hashed — we never store plaintext passwords).</p>
      <p style={{ marginTop: 6 }}><strong>Profile data:</strong> business name, contact details, payment link, and logo — only what you choose to enter.</p>
      <p style={{ marginTop: 6 }}><strong>Invoice data:</strong> client names, amounts, line items, and dates you create in the app.</p>
      <p style={{ marginTop: 6 }}><strong>Usage data:</strong> basic logs (IP address, browser type, pages visited) for security and debugging. We do not sell this data.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>2. How We Use It</h3>
      <p>Solely to provide the Service: storing your invoices, sending password reset emails, and (on Pro) sending invoices to your clients on your behalf. We do not use your data for advertising.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>3. Third Parties</h3>
      <p><strong>Supabase</strong> (database and auth) — hosted in the US, SOC 2 compliant.</p>
      <p style={{ marginTop: 6 }}><strong>Stripe</strong> (payments) — PCI-DSS compliant. We never see or store your card number.</p>
      <p style={{ marginTop: 6 }}><strong>Resend</strong> (transactional email) — used only to send invoices and password resets.</p>
      <p style={{ marginTop: 6 }}>We do not sell or share your data with any other third parties.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>4. Data Retention</h3>
      <p>Your data is retained while your account is active. You may request deletion at any time by contacting us — we will delete your account and all associated data within 30 days.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>5. Your Rights (PIPEDA)</h3>
      <p>You have the right to access, correct, or request deletion of your personal information. Contact us through the app to exercise these rights.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>6. Security</h3>
      <p>All data is encrypted in transit (TLS) and at rest. Authentication is handled by Supabase using industry-standard hashing. No system is 100% secure — please use a strong, unique password.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>7. Cookies</h3>
      <p>We use only functional cookies required for authentication (session token). We do not use tracking or advertising cookies.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>8. Contact</h3>
      <p>Privacy questions or data requests: contact us through the app. We will respond within 30 days as required by PIPEDA.</p>
    </>
  );
}
