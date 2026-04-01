import { useState } from "react";
import { supabase } from "../lib/supabase";
import "./AuthPage.css";

export default function AuthModal({ onClose, onBack }) {
  const [mode, setMode]       = useState("signup");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    setMessage("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (mode === "signup") {
      if (password !== confirm) {
        setError("Passwords don't match.");
        setLoading(false);
        return;
      }
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (err) { setError(err.message); } else { setMessage("Check your email to confirm your account."); }

    } else if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
      } else {
        // Session change fires via onAuthStateChange in App — just close the modal
        if (onClose) onClose();
      }

    } else if (mode === "forgot") {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (err) { setError(err.message); } else { setMessage("Reset link sent — check your email."); }
    }

    setLoading(false);
  }

  let submitLabel;
  if (loading)              { submitLabel = "..."; }
  else if (mode === "signup") { submitLabel = "Create Account"; }
  else if (mode === "login")  { submitLabel = "Sign In"; }
  else                        { submitLabel = "Send Reset Link"; }

  return (
    <div className="modal-backdrop">
      <div className="auth-card" style={{ maxWidth: 380, width: "90%" }}>

        {/* Back button — top left, only when coming from landing */}
        {onBack && (
          <button className="auth-back-btn" onClick={onBack}>← Back</button>
        )}

        <div className="auth-brand">
          {mode === "forgot" ? "Reset Password" : mode === "signup" ? "Create Account" : "Sign In"}
        </div>

        {mode !== "forgot" && (
          <div className="auth-toggle">
            <button className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>Sign Up</button>
            <button className={mode === "login"  ? "active" : ""} onClick={() => switchMode("login")}>Sign In</button>
          </div>
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
            <div className="field-group">
              <label className="field-label">Confirm Password</label>
              <input className="auth-field" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
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
  );
}
