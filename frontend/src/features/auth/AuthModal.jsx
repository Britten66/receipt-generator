import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import LegalModal from "../profile/LegalModal";
import "./AuthModal.css";

/*
  checkPassword: validates password strength.
  Rules: 8+ characters AND at least one number or special character.
  Returns { ok, level, msg }: ok=false blocks form submission.
*/
function checkPassword(pw) {
  if (!pw) return null;
  const longEnough = pw.length >= 8;
  const hasNumber  = /[0-9]/.test(pw);
  const hasSymbol  = /[^a-zA-Z0-9]/.test(pw);
  if (!longEnough)             return { ok: false, level: "weak",   msg: "At least 8 characters required" };
  if (!hasNumber && !hasSymbol) return { ok: false, level: "weak",   msg: "Add a number or symbol (!@#$%)" };
  if (hasNumber && hasSymbol)   return { ok: true,  level: "strong", msg: "Strong" };
  return { ok: true, level: "good", msg: "Good" };
}


export default function AuthModal({ onClose, onBack, initialMode = "signup" }) {
  const [mode, setMode]         = useState(initialMode);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [message, setMessage]   = useState("");
  const [loading, setLoading]   = useState(false);
  // Honeypot: bots autofill hidden fields, humans never see or touch this
  const [honeypot, setHoneypot] = useState("");
  // Referral code: prefilled from localStorage if a ?ref=CODE link was used.
  const [refCode, setRefCode]   = useState(() => (typeof localStorage !== "undefined" ? localStorage.getItem("pending_ref_code") || "" : ""));

  const [legal, setLegal] = useState(null); // "terms" | "privacy" | null
  const emailRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape" && onClose) onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Move focus into the modal on open
  useEffect(() => { emailRef.current?.focus(); }, []);

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
      // Bot check: honeypot field must be empty: bots fill it, humans never see it
      if (honeypot) return;

      const pwCheck = checkPassword(password);
      if (!pwCheck?.ok) {
        setError(pwCheck?.msg ?? "Password does not meet requirements.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords don't match.");
        return;
      }
    }

    setLoading(true);

    if (mode === "signup") {
      // Persist the ref code in two places so it survives any flow:
      //   1. localStorage  — picked up by fetchProfile if same-device confirmation
      //   2. user_metadata — survives even if confirmation happens on a different device
      const cleanRef = refCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      if (cleanRef) localStorage.setItem("pending_ref_code", cleanRef);

      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: cleanRef ? { ref_code: cleanRef } : undefined,
        },
      });
      if (err) {
        setError(err.message);
      } else {
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
      <div className="modal-backdrop auth-backdrop" onClick={onClose}>
        <div className="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-heading" onClick={e => e.stopPropagation()}>

          {onBack && (
            <button className="auth-back-btn" onClick={onBack}>← Back</button>
          )}

          <div className="auth-brand">InvoicePrepper</div>
          <div id="auth-heading" className="auth-heading">
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
            {/* Honeypot: visually hidden, bots fill it, real users never see it */}
            <div style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, pointerEvents: "none" }} aria-hidden="true">
              <input
                aria-hidden="true"
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="auth-email">Email</label>
              <input id="auth-email" className="auth-field" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required ref={emailRef} />
            </div>

            {mode !== "forgot" && (
              <div className="field-group">
                <label className="field-label" htmlFor="auth-password">Password</label>
                <input id="auth-password" className="auth-field" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                {mode === "signup" && password && (() => {
                  const s = checkPassword(password);
                  const color = s.level === "strong" ? "var(--paid)" : s.level === "good" ? "#7aab5a" : "var(--voided)";
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <div style={{ display: "flex", gap: 3 }}>
                        {["weak","good","strong"].map((lvl, i) => (
                          <div key={i} style={{
                            width: 28, height: 3, borderRadius: 2,
                            background: (["weak","good","strong"].indexOf(s.level) >= i) ? color : "var(--border)",
                            transition: "background 0.2s",
                          }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 10, color, fontFamily: "var(--mono)", letterSpacing: "0.06em" }}>{s.msg}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {mode === "signup" && (
              <div className="field-group">
                <label className="field-label" htmlFor="auth-confirm">Confirm Password</label>
                <input id="auth-confirm" className="auth-field" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
            )}

            {mode === "signup" && (
              <div className="field-group">
                <label className="field-label" htmlFor="auth-ref">Referral code <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
                <input
                  id="auth-ref"
                  className="auth-field"
                  type="text"
                  placeholder="ABC23XYZ"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                  maxLength={8}
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                {refCode && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>You and your friend each get 1 month of Pro free.</div>}
              </div>
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
