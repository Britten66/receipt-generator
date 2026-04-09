/*
  PasswordUpdateModal.jsx — the modal for setting a new password.

  This modal appears when the user arrives at the site after clicking a password reset
  link from their email. Supabase handles the token in the URL automatically.
  All we need to do here is call supabase.auth.updateUser({ password }) with the new value.

  Props:
    onClose() — called after the password is updated (with a 2-second delay so the user
                can see the success message before the modal disappears)

  State:
    password — what the user types in the "New Password" field
    confirm  — what the user types in the "Confirm Password" field
    error    — an error message to show in red if validation or the API call fails
    loading  — true while the API call is in progress (disables the submit button)
    done     — true after a successful password update (switches to a success message)
*/

import { useState } from "react";
import { supabase } from "../lib/supabase";

// Same rules as AuthModal: 8+ chars and at least one number or symbol
function checkPassword(pw) {
  if (!pw) return null;
  const longEnough = pw.length >= 8;
  const hasNumber  = /[0-9]/.test(pw);
  const hasSymbol  = /[^a-zA-Z0-9]/.test(pw);
  if (!longEnough)              return { ok: false, level: "weak",   msg: "At least 8 characters required" };
  if (!hasNumber && !hasSymbol) return { ok: false, level: "weak",   msg: "Add a number or symbol (!@#$%)" };
  if (hasNumber && hasSymbol)   return { ok: true,  level: "strong", msg: "Strong" };
  return { ok: true, level: "good", msg: "Good" };
}

export default function PasswordUpdateModal({ onClose }) {
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  /*
    handleSubmit(event) — called when the user clicks "Update Password".

    event.preventDefault() stops the browser's default form submission behaviour
    (which would reload the page — we don't want that).

    Validates:
      1. The two password fields must match
      2. The password must be at least 6 characters (Supabase minimum)

    Then calls supabase.auth.updateUser to set the new password.
    On success, sets done = true and closes the modal after 2 seconds.
  */
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const pwCheck = checkPassword(password);
    if (!pwCheck?.ok) {
      setError(pwCheck?.msg ?? "Password does not meet requirements.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    // Send the new password to Supabase
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Success — show the confirmation message for 2 seconds, then close
    setDone(true);
    setTimeout(onClose, 2000);
  }

  /*
    Determine the label for the submit button.

    "Updating..." while the API call is in progress (loading is true).
    "Update Password" when ready to submit.
  */
  let submitButtonLabel;
  if (loading) {
    submitButtonLabel = "Updating...";
  } else {
    submitButtonLabel = "Update Password";
  }

  /*
    Determine what to render inside the modal body.

    If done is true, show a success confirmation message.
    If done is false, show the password update form.
  */
  let bodyContent;
  if (done) {
    // Show a success message — the modal will close automatically after 2 seconds
    bodyContent = (
      <p style={{ fontSize: 12, color: "var(--paid)", textAlign: "center", padding: "12px 0" }}>
        Password updated ✓
      </p>
    );
  } else {
    // Show the form for entering and confirming the new password
    bodyContent = (
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        <div className="field-group">
          <label className="field-label">New Password</label>
          <input
            className="field"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
          {password && (() => {
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

        {/* Show the error message if validation or the API call failed */}
        {error && <div className="auth-error">{error}</div>}

        <div className="modal-footer" style={{ padding: 0, border: "none", background: "none" }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {submitButtonLabel}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <span className="modal-title">Set New Password</span>
        </div>
        <div className="modal-body">
          {bodyContent}
        </div>
      </div>
    </div>
  );
}
