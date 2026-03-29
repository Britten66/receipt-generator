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

    // Make sure both fields match
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    // Supabase requires passwords to be at least 6 characters
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
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
