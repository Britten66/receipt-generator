import { useState } from "react";
import { saveProfile } from "../api/profile";
import { supabase } from "../lib/supabase";

export default function ProfileModal({ profile, token, userEmail, onSave, onClose }) {
  const [form, setForm] = useState({
    business_name: profile?.business_name ?? "",
    bio: profile?.bio ?? "",
    website: profile?.website ?? "",
    payment_url: profile?.payment_url ?? "",
    address: profile?.address ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const result = await saveProfile(form, token);
    setSaving(false);
    onSave(result);
    onClose();
  };

  const handleResetPassword = async () => {
    if (!userEmail) return;
    setResetLoading(true);
    await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: window.location.origin,
    });
    setResetLoading(false);
    setResetSent(true);
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">Profile</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="profile-section-label">Business</div>

          <div className="field-group">
            <label className="field-label">Business Name</label>
            <input className="field" placeholder="Acme Co." value={form.business_name} onChange={(e) => set("business_name", e.target.value)} autoFocus />
          </div>
          <div className="field-group">
            <label className="field-label">Bio / Tagline</label>
            <input className="field" placeholder="Freelance developer · React & Node" value={form.bio} onChange={(e) => set("bio", e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Website</label>
            <input className="field" placeholder="https://yoursite.com" value={form.website} onChange={(e) => set("website", e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Payment Link</label>
            <input className="field" placeholder="https://buy.stripe.com/... or paypal.me/..." value={form.payment_url} onChange={(e) => set("payment_url", e.target.value)} />
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, display: "block" }}>Paste your Stripe Payment Link or PayPal.me — a QR code will appear on unpaid receipts</span>
          </div>

          <div className="profile-section-label" style={{ marginTop: 16 }}>Contact</div>

          <div className="field-group">
            <label className="field-label">Address</label>
            <input className="field" placeholder="123 Main St, Halifax, NS" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Email</label>
            <input className="field" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Phone</label>
            <input className="field" placeholder="(902) 555-0100" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>

          <div className="profile-section-label" style={{ marginTop: 16 }}>Security</div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text)" }}>{userEmail}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Account email</div>
            </div>
            {resetSent ? (
              <span style={{ fontSize: 10, color: "var(--paid)", letterSpacing: "0.05em" }}>Reset link sent ✓</span>
            ) : (
              <button
                className="btn btn-ghost"
                style={{ fontSize: 10, padding: "4px 10px", flexShrink: 0 }}
                onClick={handleResetPassword}
                disabled={resetLoading}
              >
                {resetLoading ? "..." : "Reset Password"}
              </button>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
