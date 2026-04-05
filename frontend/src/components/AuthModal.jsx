import { useState } from "react";
import { supabase } from "../lib/supabase";
import LegalModal from "./LegalModal";
import "./AuthPage.css";

export default function AuthModal({ onClose, onBack, initialMode = "signup" }) {
  const [mode, setMode]       = useState(initialMode);
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // LEGAL COMPLIANCE: consent must be checked before account creation.
  // Unchecked by default — user must actively agree (CASL / PIPEDA requirement).
  const [agreed, setAgreed]         = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(true); // pre-checked: transactional emails are expected
  const [legal, setLegal]           = useState(null);  // "terms" | "privacy" | null

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    setMessage("");
  }

  async function handleGoogleSignIn() {
    setError("");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (mode === "signup") {
      // LEGAL COMPLIANCE: block signup without explicit consent to T&C and Privacy Policy.
      if (!agreed) {
        setError("You must agree to the Terms and Privacy Policy to create an account.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords don't match.");
        setLoading(false);
        return;
      }
    }

    setLoading(true);

    if (mode === "signup") {
      const consentAt = new Date().toISOString();
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          // Store consent timestamp and email-opt-in in user metadata.
          // This creates a server-side audit trail of when the user agreed.
          data: {
            terms_agreed_at:    consentAt,
            email_marketing_ok: emailOptIn,
          },
        },
      });
      if (err) {
        setError(err.message);
      } else {
        // Also store in localStorage as a local fallback record.
        localStorage.setItem("consent_at", consentAt);
        localStorage.setItem("email_opt_in", emailOptIn ? "1" : "0");
        setMessage("Check your email to confirm your account.");
      }

    } else if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
      } else {
        if (onClose) onClose();
      }

    } else if (mode === "forgot") {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (err) { setError(err.message); } else { setMessage("Reset link sent. Check your email."); }
    }

    setLoading(false);
  }

  let submitLabel;
  if (loading)               { submitLabel = "..."; }
  else if (mode === "signup") { submitLabel = "Create Account"; }
  else if (mode === "login")  { submitLabel = "Sign In"; }
  else                        { submitLabel = "Send Reset Link"; }

  return (
    <>
      <div className="modal-backdrop auth-backdrop">
        <div className="auth-card">

          {onBack && (
            <button className="auth-back-btn" onClick={onBack}>← Back</button>
          )}

          <div className="auth-brand">InvoicePrepper</div>
          <div className="auth-heading">
            {mode === "forgot" ? "Reset your password" : mode === "signup" ? "Create your account" : "Welcome back"}
          </div>

          {mode !== "forgot" && (
            <div className="auth-toggle">
              <button className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>Sign Up</button>
              <button className={mode === "login"  ? "active" : ""} onClick={() => switchMode("login")}>Sign In</button>
            </div>
          )}

          {mode !== "forgot" && (
            <button type="button" className="auth-google-btn" onClick={handleGoogleSignIn}>
              <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              </svg>
              Continue with Google
            </button>
          )}

          {mode !== "forgot" && (
            <div className="auth-divider"><span>or</span></div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label className="field-label">Email</label>
              <input className="auth-field" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>

            {mode !== "forgot" && (
              <div className="field-group">
                <label className="field-label">Password</label>
                <input className="auth-field" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            )}

            {mode === "signup" && (
              <>
                <div className="field-group">
                  <label className="field-label">Confirm Password</label>
                  <input className="auth-field" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>

                {/* LEGAL COMPLIANCE: required consent checkbox — must be checked to proceed */}
                <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border-light)", paddingTop: 14 }}>
                  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <span>
                      I have read and agree to the{" "}
                      <button type="button" onClick={() => setLegal("terms")} style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>
                        Terms of Service
                      </button>
                      {" "}and{" "}
                      <button type="button" onClick={() => setLegal("privacy")} style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>
                        Privacy Policy
                      </button>
                      . *
                    </span>
                  </label>

                  {/* CASL / CAN-SPAM: pre-checked opt-in for transactional email is acceptable */}
                  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
                    <input
                      type="checkbox"
                      checked={emailOptIn}
                      onChange={(e) => setEmailOptIn(e.target.checked)}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <span>I agree to receive email receipts and account notifications.</span>
                  </label>
                </div>
              </>
            )}

            {error   && <div className="auth-error">{error}</div>}
            {message && <div className="auth-message">{message}</div>}

            <button className="auth-submit" type="submit" disabled={loading}>{submitLabel}</button>

            {mode === "login" && (
              <button type="button" onClick={() => switchMode("forgot")} className="auth-text-btn">Forgot password?</button>
            )}
            {mode === "forgot" && (
              <button type="button" onClick={() => switchMode("login")} className="auth-text-btn">Back to sign in</button>
            )}
          </form>
        </div>
      </div>

      {/* Legal modal opens on top of auth modal without closing it */}
      {legal && <LegalModal type={legal} onClose={() => setLegal(null)} />}
    </>
  );
}
