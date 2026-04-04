export default function LegalModal({ type, onClose }) {
  const isTerms = type === "terms";

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520, maxHeight: "80vh", overflowY: "auto" }}>
        <div className="modal-header">
          <span className="modal-title">{isTerms ? "Terms of Service" : "Privacy Policy"}</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={onClose}>&#x2715;</button>
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
      <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 16 }}>Last updated: April 2026. Operated by an individual in Canada.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>1. Acceptance</h3>
      <p>By accessing or using Invoice Prepper (the "Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. Continued use after any update to these Terms constitutes acceptance of the revised Terms.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>2. Description of Service</h3>
      <p>Invoice Prepper is an invoice creation and tracking tool for freelancers, contractors, and small businesses. It provides PDF generation, invoice tracking, and optional client-facing email delivery. The Service is a productivity and record-keeping aid only. It is not accounting software, legal advice, tax preparation software, or a licensed financial service of any kind. Nothing in the Service constitutes professional financial, tax, or legal advice.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>3. Eligibility</h3>
      <p>You must be at least 16 years old to use the Service. By using the Service you represent that you meet this requirement and that you have the legal capacity to enter into a binding agreement in your jurisdiction.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>4. Your Account</h3>
      <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate information and keep it updated. You may not share your account with others or use the Service for any unlawful purpose.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>5. Your Data</h3>
      <p>You retain full ownership of all data you enter into the Service, including invoices, client names, amounts, and business details. You grant the operator a limited, non-exclusive licence to store and process that data solely as necessary to provide the Service to you. This licence ends when you delete your account or request deletion of your data.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>6. Tax Responsibility</h3>
      <p>Invoice Prepper is a record-keeping tool only. It does not calculate, collect, file, remit, or advise on any taxes. The tax fields in the app are provided for your own convenience and record-keeping. You are solely responsible for understanding and fulfilling all tax obligations applicable to your business and your clients, including but not limited to GST/HST, PST, QST, VAT, sales tax, and income tax in your jurisdiction. No amount displayed in this app constitutes a legally compliant tax charge or a tax filing of any kind. The operator is not registered as a tax preparer, accountant, or financial adviser. Consult a qualified professional for advice specific to your situation.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>7. Prohibited Use</h3>
      <p>You may not use the Service to generate fraudulent invoices, impersonate any person or business, harass or deceive clients, or engage in any activity that violates applicable law in your jurisdiction or in any jurisdiction where your clients are located. The Service may not be used for invoicing in connection with illegal goods or services.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>8. Paid Plans and Billing</h3>
      <p>Pro and Voice AI plan subscriptions are billed on a recurring monthly basis via Stripe. The applicable price is displayed at checkout before you confirm your purchase. By subscribing you authorise the operator to charge your payment method on a recurring monthly basis until you cancel.</p>
      <p style={{ marginTop: 6 }}><strong>Auto-renewal:</strong> Subscriptions automatically renew each month unless cancelled before the renewal date. You may cancel at any time from the Billing section of the app. Cancellation takes effect at the end of the current paid billing period and you retain access until that date.</p>
      <p style={{ marginTop: 6 }}><strong>Refunds:</strong> The operator does not offer refunds for partial billing periods. If you are located in a jurisdiction where mandatory refund or cooling-off period rights apply under consumer protection law, those rights are not affected by this clause.</p>
      <p style={{ marginTop: 6 }}><strong>Taxes on purchases:</strong> Subscription fees do not include taxes applicable to your purchase. You are responsible for any such taxes under the laws of your jurisdiction.</p>
      <p style={{ marginTop: 6 }}><strong>Price changes:</strong> The operator may change subscription prices with at least 30 days notice by email to your registered address. Continued use after the effective date constitutes acceptance.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>8a. AI Features (Voice AI Plan)</h3>
      <p>The Voice AI plan includes voice recording and text description parsing powered by Groq, Inc. By using either feature you acknowledge and agree to the following:</p>
      <p style={{ marginTop: 6 }}><strong>Voice processing:</strong> Your audio is transmitted to Groq for transcription using Groq's Whisper model. The transcript is then processed by Groq's language model to extract invoice fields. Invoice Prepper does not retain your audio recordings — audio is temporarily buffered during processing and deleted immediately after transcription.</p>
      <p style={{ marginTop: 6 }}><strong>Text processing:</strong> Text you submit to the AI parser is transmitted to Groq's language model to extract invoice fields. This may include service descriptions, amounts, and names you type.</p>
      <p style={{ marginTop: 6 }}><strong>Data scope:</strong> Only content you actively submit for parsing is sent to Groq. Your stored invoices, historical records, and account credentials are never sent to Groq.</p>
      <p style={{ marginTop: 6 }}><strong>Third-party terms:</strong> Use of AI features is subject to Groq's Terms of Service and Privacy Policy. By using these features you consent to your input being processed by Groq under their policies.</p>
      <p style={{ marginTop: 6 }}><strong>Usage limits:</strong> AI parsing is limited to 20 uses per day per account.</p>
      <p style={{ marginTop: 6 }}><strong>Accuracy:</strong> AI-generated fields are a convenience only. You are responsible for reviewing all invoice data before sending to clients. No warranty is made as to the accuracy of AI output.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>9. Electronic Communications and Anti-Spam</h3>
      <p>By creating an account you consent to receive transactional emails from Invoice Prepper including password resets, billing confirmations, and material notices about the Service. These communications are necessary to operate your account and are not marketing messages. You may not use the Service to send unsolicited commercial messages. You are solely responsible for ensuring that any invoice you send through the Service complies with applicable anti-spam and electronic commerce laws in your jurisdiction and in the jurisdiction of your recipients, including Canada's Anti-Spam Legislation (CASL) and the US CAN-SPAM Act where applicable.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>10. Intellectual Property</h3>
      <p>The Service, its design, code, and branding are owned by the operator and protected by applicable intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the Service. Your invoice content and business data remain your property.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>11. Indemnification</h3>
      <p>You agree to indemnify, defend, and hold harmless the operator and any affiliated individuals from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable legal fees) arising out of or related to: (a) your use of the Service; (b) your violation of these Terms; (c) invoices you create or send using the Service; (d) your violation of any third-party rights; or (e) any tax, regulatory, or legal obligations arising from your business activities. This indemnification obligation survives termination of your account.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>12. No Warranties</h3>
      <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or uninterrupted availability. The operator does not warrant that the Service will be error-free, that data will not be lost, or that invoices sent through the Service will be received, opened, or accepted by recipients.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>13. Limitation of Liability</h3>
      <p>To the maximum extent permitted by applicable law, the operator of Invoice Prepper shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, including but not limited to lost revenue, missed payments, tax penalties, filing errors, or data loss, even if the operator has been advised of the possibility of such damages.</p>
      <p style={{ marginTop: 6 }}>The operator's total cumulative liability to you for any claims arising under or related to these Terms shall not exceed the total amounts you paid to the operator in the three-month period immediately preceding the event giving rise to the claim, or CAD $50, whichever is greater.</p>
      <p style={{ marginTop: 6 }}>Nothing in these Terms excludes or limits liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be excluded or limited under applicable law.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>14. Termination</h3>
      <p>The operator reserves the right to suspend or terminate your account at any time for violation of these Terms, fraudulent use, or any other reason, with or without notice. You may delete your account at any time. Clauses 5, 6, 11, 12, 13, and 15 survive termination.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>15. Dispute Resolution</h3>
      <p>Before initiating any formal legal proceedings, you agree to contact the operator at support@invoiceprepper.com and attempt to resolve the dispute informally for at least 30 days. If the dispute is not resolved informally, it shall be governed by the laws of Canada. Nothing in this clause limits any rights you may have under the mandatory consumer protection laws of your own jurisdiction.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>16. Governing Law</h3>
      <p>These Terms are governed by and construed in accordance with the laws of Canada and the laws of the province in which the operator resides, without regard to conflict of law principles. Nothing in these Terms limits any mandatory rights you may have under the consumer protection or data protection laws of your own jurisdiction.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>17. Severability</h3>
      <p>If any provision of these Terms is found to be unenforceable or invalid under applicable law, that provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>18. Contact</h3>
      <p>Questions about these Terms: <a href="mailto:support@invoiceprepper.com" style={{ color: "var(--accent)" }}>support@invoiceprepper.com</a></p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 16 }}>Last updated: April 2026. Operated by an individual in Canada. Applies globally.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>1. Who We Are</h3>
      <p>Invoice Prepper is operated by an individual based in Canada. References to "we", "us", or "the operator" in this policy refer to that individual. This policy applies to all users of Invoice Prepper regardless of location.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>2. What We Collect</h3>
      <p><strong>Account data:</strong> email address and password. Passwords are hashed using industry-standard methods. Plaintext passwords are never stored.</p>
      <p style={{ marginTop: 6 }}><strong>Profile data:</strong> business name, address, contact details, payment link, and logo. Only what you choose to enter.</p>
      <p style={{ marginTop: 6 }}><strong>Invoice data:</strong> client names, amounts, line items, dates, and notes you create in the app.</p>
      <p style={{ marginTop: 6 }}><strong>Billing data:</strong> Stripe handles all payment processing. We receive only a Stripe customer ID and subscription status. We never see or store your card number, bank details, or full billing address.</p>
      <p style={{ marginTop: 6 }}><strong>Usage data:</strong> basic server logs including IP address and request timestamps, used for security and debugging only. Not sold or used for advertising.</p>
      <p style={{ marginTop: 6 }}><strong>AI data (Voice AI plan only):</strong> when you use the voice or text AI parser, your input is transmitted to Groq, Inc. for processing. We do not retain audio recordings — audio is temporarily buffered during processing and deleted immediately after transcription. We store only a daily usage count per account for rate-limiting purposes. Your stored invoices and historical data are never sent to Groq.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>3. How We Use Your Data</h3>
      <p>We use your data solely to provide the Service: storing your invoices, sending transactional emails (password resets, billing confirmations), and on Pro and Voice AI plans, sending invoices to your clients on your behalf. We do not use your data for advertising, behavioural profiling, or any purpose beyond operating the Service.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>4. Legal Basis for Processing</h3>
      <p>For users in the European Economic Area and United Kingdom, our legal basis for processing your personal data is: (a) performance of a contract, for data necessary to provide the Service you signed up for; (b) legitimate interests, for security logging and fraud prevention; and (c) consent, for any optional features where we have asked for your consent. You may withdraw consent at any time without affecting the lawfulness of processing before withdrawal.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>5. Third-Party Processors</h3>
      <p><strong>Supabase</strong> (database and authentication): servers in the United States, SOC 2 Type II certified.</p>
      <p style={{ marginTop: 6 }}><strong>Stripe</strong> (payment processing): PCI-DSS Level 1 certified. Stripe's privacy policy governs their handling of your payment data.</p>
      <p style={{ marginTop: 6 }}><strong>Resend</strong> (transactional email): used only to deliver invoices and account emails on your behalf.</p>
      <p style={{ marginTop: 6 }}><strong>Cloudflare</strong> (CDN and security): your requests pass through Cloudflare's network. Cloudflare may log IP addresses per their privacy policy.</p>
      <p style={{ marginTop: 6 }}><strong>Groq, Inc.</strong> (Voice AI plan only): input you actively submit for AI parsing is processed by Groq under their Privacy Policy. No stored invoice data or account credentials are sent to Groq.</p>
      <p style={{ marginTop: 6 }}>We do not sell your personal data to any third party. We do not share your data with advertisers.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>6. International Data Transfers</h3>
      <p>Invoice Prepper is available globally. By using the Service you acknowledge that your data may be processed in Canada and the United States where our infrastructure providers operate. For users in the European Economic Area and United Kingdom, transfers to the United States are made on the basis of standard contractual clauses or equivalent safeguards maintained by our processors (Supabase, Stripe, Resend, Cloudflare). For all other users, by using the Service you consent to this transfer as a condition of use.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>7. Your Rights</h3>
      <p>Regardless of your location, you have the right to access, correct, export, or request deletion of your personal data held by Invoice Prepper. Users in Canada have these rights under PIPEDA. Users in the EU and UK have these rights under GDPR and UK GDPR respectively, including the right to data portability and the right to object to processing. Users in certain US states (including California under CCPA) have additional rights regarding disclosure and deletion.</p>
      <p style={{ marginTop: 6 }}>To exercise any of these rights, email <a href="mailto:support@invoiceprepper.com" style={{ color: "var(--accent)" }}>support@invoiceprepper.com</a>. We will respond within 30 days.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>8. Data Retention</h3>
      <p>Your data is retained while your account is active. You may request full account deletion at any time and we will delete your account and all associated personal data within 30 days. Billing records may be retained as required by Stripe's policies and applicable financial regulations. Anonymised aggregate usage statistics may be retained indefinitely.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>9. Security</h3>
      <p>All data is encrypted in transit (TLS 1.2 or higher) and at rest. Authentication is handled by Supabase with industry-standard password hashing. Row-level security policies ensure each user can only access their own data. No system is 100% secure. Use a strong, unique password and enable any two-factor authentication options available to you.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>10. Cookies</h3>
      <p>We use only functional cookies strictly necessary for authentication (session token). We do not use tracking, advertising, or analytics cookies. No cookie consent banner is shown because no non-essential cookies are set.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>11. Children</h3>
      <p>The Service is not directed at individuals under 16 years of age. We do not knowingly collect personal data from anyone under 16. If you believe a minor has created an account, contact us and we will delete it promptly.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>12. Changes to This Policy</h3>
      <p>We may update this Privacy Policy at any time. We will notify registered users of material changes by email where reasonably practicable. Continued use of the Service after changes are posted constitutes acceptance.</p>

      <h3 style={{ fontSize: 12, fontWeight: 700, margin: "14px 0 6px", color: "var(--text)" }}>13. Contact and Complaints</h3>
      <p>Privacy questions or data requests: <a href="mailto:support@invoiceprepper.com" style={{ color: "var(--accent)" }}>support@invoiceprepper.com</a>. We will respond within 30 days. If you are an EU or UK resident and are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority.</p>
    </>
  );
}
