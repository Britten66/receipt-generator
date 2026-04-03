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
      <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 16 }}>Last updated: April 2026</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>1. Acceptance</h3>
      <p>By accessing or using Invoice Prepper ("Service"), you agree to these Terms. If you do not agree, do not use the Service.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>2. Description</h3>
      <p>Invoice Prepper is an invoice management tool for freelancers, contractors, and small businesses worldwide. It provides PDF generation, invoice tracking, and client-facing delivery. The Service is for record-keeping purposes only. It is not accounting software, legal advice, or tax preparation software.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>3. Your Account</h3>
      <p>You are responsible for maintaining the security of your account credentials. You must provide accurate information and keep it updated. You may not share your account or use the Service for unlawful purposes.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>4. Your Data</h3>
      <p>You retain full ownership of all data you enter into the Service: invoices, client names, amounts, and business details. You grant us a limited licence to store and process that data solely to provide the Service to you.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>5. Tax Responsibility</h3>
      <p>Invoice Prepper is a record-keeping tool. It does not calculate, file, remit, or advise on any taxes. You are solely responsible for understanding and fulfilling your own tax obligations, including sales tax, GST/HST, VAT, income tax, or any other taxes applicable in your jurisdiction. The tax fields in the app are for your own record-keeping only. We make no representation that any amount entered constitutes a legally compliant tax charge. Consult a qualified accountant or tax professional for advice specific to your situation.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>6. Prohibited Use</h3>
      <p>You may not use the Service to generate fraudulent invoices, impersonate another person or business, or engage in any activity that violates applicable law in your jurisdiction.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>7. Paid Plans</h3>
      <p>Pro plan subscriptions are billed monthly via Stripe. You may cancel at any time; cancellation takes effect at the end of the current billing period. We do not offer refunds for partial periods except where required by applicable law.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>8. Limitation of Liability</h3>
      <p>To the maximum extent permitted by applicable law, Invoice Prepper and its operator are not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including any tax penalties, filing errors, or financial losses. Our total liability to you shall not exceed the amounts you paid us in the 3 months preceding the claim.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>9. Changes</h3>
      <p>We may update these Terms at any time. Continued use after changes constitutes acceptance. We will notify registered users of material changes by email where reasonably practicable.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>10. Governing Law</h3>
      <p>These Terms are governed by the laws of Canada. To the extent any dispute requires a forum, it shall be resolved under Canadian federal law or the laws of the province in which the operator resides. Nothing in these Terms limits any rights you may have under the consumer protection laws of your own jurisdiction.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>11. Contact</h3>
      <p>Questions? Contact us through the app or at the email address on file with your account.</p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 16 }}>Last updated: April 2026 · Operated from Canada · Applies globally</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>1. What We Collect</h3>
      <p><strong>Account data:</strong> email address, password (hashed; we never store plaintext passwords).</p>
      <p style={{ marginTop: 6 }}><strong>Profile data:</strong> business name, contact details, payment link, and logo. Only what you choose to enter.</p>
      <p style={{ marginTop: 6 }}><strong>Invoice data:</strong> client names, amounts, line items, and dates you create in the app.</p>
      <p style={{ marginTop: 6 }}><strong>Usage data:</strong> basic logs (IP address, browser type, pages visited) for security and debugging. We do not sell this data.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>2. How We Use It</h3>
      <p>Solely to provide the Service: storing your invoices, sending password reset emails, and (on Pro) sending invoices to your clients on your behalf. We do not use your data for advertising or sell it to third parties.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>3. Third Parties</h3>
      <p><strong>Supabase</strong> (database and auth): hosted in the US, SOC 2 compliant.</p>
      <p style={{ marginTop: 6 }}><strong>Stripe</strong> (payments): PCI-DSS compliant. We never see or store your card number.</p>
      <p style={{ marginTop: 6 }}><strong>Resend</strong> (transactional email): used only to send invoices and password resets.</p>
      <p style={{ marginTop: 6 }}>We do not sell or share your data with any other third parties.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>4. International Users</h3>
      <p>Invoice Prepper is available globally. By using the Service, you consent to your data being processed in Canada and the United States (where our infrastructure providers operate). If you are located in the European Economic Area, UK, or other jurisdictions with data transfer restrictions, you acknowledge this cross-border transfer as a condition of using the Service.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>5. Canadian Privacy Law (PIPEDA)</h3>
      <p>As a Canadian-operated service, we comply with the Personal Information Protection and Electronic Documents Act (PIPEDA). You have the right to access, correct, or request deletion of your personal information. Contact us through the app to exercise these rights. We will respond within 30 days.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>6. Data Retention</h3>
      <p>Your data is retained while your account is active. You may request deletion at any time by contacting us. We will delete your account and all associated data within 30 days.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>7. Security</h3>
      <p>All data is encrypted in transit (TLS) and at rest. Authentication is handled by Supabase using industry-standard hashing. No system is 100% secure. Please use a strong, unique password.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>8. Cookies</h3>
      <p>We use only functional cookies required for authentication (session token). We do not use tracking or advertising cookies.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>9. Contact</h3>
      <p>Privacy questions or data requests: contact us through the app. We will respond within 30 days as required by PIPEDA.</p>
    </>
  );
}
