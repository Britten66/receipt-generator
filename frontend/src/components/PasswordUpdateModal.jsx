import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function PasswordUpdateModal({ onClose }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <span className="modal-title">Set New Password</span>
        </div>
        <div className="modal-body">
          {done ? (
            <p style={{ fontSize: 12, color: "var(--paid)", textAlign: "center", padding: "12px 0" }}>
              Password updated ✓
            </p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="field-group">
                <label className="field-label">New Password</label>
                <input className="field" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
              </div>
              <div className="field-group">
                <label className="field-label">Confirm Password</label>
                <input className="field" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <div className="modal-footer" style={{ padding: 0, border: "none", background: "none" }}>
                <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
