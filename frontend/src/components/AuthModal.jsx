/*
  AuthModal.jsx — the sign up / sign in / forgot password modal.

  Props:
    onClose() — called when the modal should be closed (after login, or when the user cancels)

  The modal has three modes controlled by the "mode" state variable:
    "signup"  — create a new account (email + password + confirm password)
    "login"   — sign into an existing account (email + password)
    "forgot"  — send a password reset email (email only)

  The user switches between modes using the Sign Up / Sign In tab buttons,
  or by clicking "Forgot password?" which goes to "forgot" mode.

  Uses Supabase Auth for all three operations.
*/

import { useState } from "react";
import { supabase } from "../lib/supabase";
import "./AuthPage.css";

export default function AuthModal({ onClose }) {
  /*
    mode — which form to show.
    Starts on "signup" so new users see the create-account form first.
    Possible values: "signup", "login", "forgot"
  */
  const [mode, setMode] = useState("signup");

  // Form field values — stored as controlled inputs
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState(""); // only used in signup mode

  // Feedback messages shown below the form
  const [error,   setError]   = useState(""); // red error text (e.g. "Passwords don't match")
  const [message, setMessage] = useState(""); // green success text (e.g. "Check your email")

  // loading — true while an async auth call is in progress (disables the submit button)
  const [loading, setLoading] = useState(false);

  /*
    switchMode(newMode) — changes which form is shown and clears any old error/message text.

    Arguments:
      newMode — one of "signup", "login", or "forgot"

    We clear error and message on every mode switch so stale text from
    the previous form doesn't show under the new one.
  */
  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    setMessage("");
  }

  /*
    handleSubmit(event) — called when the user clicks the submit button.

    event.preventDefault() stops the browser from doing a full page reload
    (which is the default HTML form behaviour — we don't want that here).

    Then we run the appropriate Supabase call depending on the current mode.
  */
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (mode === "signup") {
      // Validate that both password fields match before sending to Supabase
      if (password !== confirm) {
        setError("Passwords don't match.");
        setLoading(false);
        return;
      }

      // Create a new account
      // emailRedirectTo is where Supabase sends the user after they click the confirmation email
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage("Check your email to confirm your account.");
      }

    } else if (mode === "login") {
      // Sign into an existing account
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

      if (loginError) {
        setError(loginError.message);
      } else {
        // Login succeeded — close the modal
        // We check if onClose exists before calling it just in case the prop wasn't passed
        if (onClose) {
          onClose();
        }
      }

    } else if (mode === "forgot") {
      // Send a password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage("Password reset link sent — check your email.");
      }
    }

    setLoading(false);
  }

  /*
    handleBackdropClick(event) — closes the modal when the user clicks the dark area behind it.

    event.target      — the element that was actually clicked
    event.currentTarget — the element this handler is attached to (the backdrop div)

    If those two are the same, the user clicked on the backdrop itself, not the card inside it.
  */
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      if (onClose) {
        onClose();
      }
    }
  }

  /*
    Determine the text for the submit button.

    Three modes → three different labels.
    We also show "..." while loading to indicate something is happening.
  */
  let submitButtonLabel;
  if (loading) {
    submitButtonLabel = "...";
  } else if (mode === "signup") {
    submitButtonLabel = "Create Account";
  } else if (mode === "login") {
    submitButtonLabel = "Sign In";
  } else {
    // mode === "forgot"
    submitButtonLabel = "Send Reset Link";
  }

  /*
    CSS class names for the tab buttons (Sign Up / Sign In).
    The active tab gets the "active" class which highlights it.
  */
  let signUpTabClass;
  if (mode === "signup") {
    signUpTabClass = "active";
  } else {
    signUpTabClass = "";
  }

  let signInTabClass;
  if (mode === "login") {
    signInTabClass = "active";
  } else {
    signInTabClass = "";
  }

  /*
    Determine the heading text shown at the top of the modal.
    In forgot mode it says "Reset Password". Otherwise it says "Unlock Your Account".
  */
  let headingText;
  if (mode === "forgot") {
    headingText = "Reset Password";
  } else {
    headingText = "Unlock Your Account";
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="auth-card" style={{ maxWidth: 400, width: "90%" }}>

        {/* Header row: heading text on left, close button on right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="auth-brand">{headingText}</div>
          <button className="btn-icon close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Feature list — only shown in signup/login mode, not on the forgot password screen */}
        {mode !== "forgot" && (
          <div className="auth-perks">
            <div className="perk-item">✓ Saved business profile — auto-fills every receipt</div>
            <div className="perk-item">✓ Access your receipts from any device</div>
            <div className="perk-item">✓ Receipt history that never expires</div>
          </div>
        )}

        {/* Sign Up / Sign In tab toggle — hidden on the forgot password screen */}
        {mode !== "forgot" && (
          <div className="auth-toggle">
            <button className={signUpTabClass} onClick={() => switchMode("signup")}>
              Sign Up
            </button>
            <button className={signInTabClass} onClick={() => switchMode("login")}>
              Sign In
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>

          {/* Email field — shown in all three modes */}
          <div className="field-group">
            <label className="field-label">Email</label>
            <input
              className="field"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Password field — shown in signup and login modes, hidden in forgot mode */}
          {mode !== "forgot" && (
            <div className="field-group">
              <label className="field-label">Password</label>
              <input
                className="field"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {/* Confirm Password field — only shown in signup mode */}
          {mode === "signup" && (
            <div className="field-group">
              <label className="field-label">Confirm Password</label>
              <input
                className="field"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          )}

          {/* Show error or success messages if they're set */}
          {error   && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          {/* Submit button — label changes based on mode (computed above) */}
          <button className="auth-submit" type="submit" disabled={loading}>
            {submitButtonLabel}
          </button>

          {/* "Forgot password?" link — only shown when the user is on the login tab */}
          {mode === "login" && (
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                color: "var(--text-muted)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                padding: "4px 0",
                fontFamily: "var(--mono)",
              }}
            >
              Forgot password?
            </button>
          )}

          {/* "Back to sign in" link — only shown on the forgot password screen */}
          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                color: "var(--text-muted)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                padding: "4px 0",
                fontFamily: "var(--mono)",
              }}
            >
              Back to sign in
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
