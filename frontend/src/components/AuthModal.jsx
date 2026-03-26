import { useState } from "react";
import { supabase } from "../lib/supabase";
import "./AuthPage.css";

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = (m) => { setMode(m); setError(""); setMessage(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (mode === "signup") {
      if (password !== confirm) { setError("Passwords don't match."); setLoading(false); return; }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setError(error.message);
      else setMessage("Check your email to confirm your account.");

    } else if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else onClose?.();

    } else if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) setError(error.message);
      else setMessage("Password reset link sent — check your email.");
    }

    setLoading(false);
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="auth-card" style={{ maxWidth: 400, width: "90%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="auth-brand">
            {mode === "forgot" ? "Reset Password" : "Unlock Your Account"}
          </div>
          <button className="btn-icon close-btn" onClick={onClose}>✕</button>
        </div>

        {mode !== "forgot" && (
          <div className="auth-perks">
            <div className="perk-item">✓ Saved business profile — auto-fills every receipt</div>
            <div className="perk-item">✓ Access your receipts from any device</div>
            <div className="perk-item">✓ Receipt history that never expires</div>
          </div>
        )}

        {mode !== "forgot" && (
          <div className="auth-toggle">
            <button className={mode === "signup" ? "active" : ""} onClick={() => reset("signup")}>
              Sign Up
            </button>
            <button className={mode === "login" ? "active" : ""} onClick={() => reset("login")}>
              Sign In
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">Email</label>
            <input className="field" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>

          {mode !== "forgot" && (
            <div className="field-group">
              <label className="field-label">Password</label>
              <input className="field" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          )}

          {mode === "signup" && (
            <div className="field-group">
              <label className="field-label">Confirm Password</label>
              <input className="field" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "..." : mode === "signup" ? "Create Account" : mode === "login" ? "Sign In" : "Send Reset Link"}
          </button>

          {mode === "login" && (
            <button
              type="button"
              onClick={() => reset("forgot")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-muted)", textDecoration: "underline", textUnderlineOffset: 3, padding: "4px 0", fontFamily: "var(--mono)" }}
            >
              Forgot password?
            </button>
          )}

          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => reset("login")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-muted)", textDecoration: "underline", textUnderlineOffset: 3, padding: "4px 0", fontFamily: "var(--mono)" }}
            >
              Back to sign in
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
