import { useState, useRef } from "react";
import { saveProfile } from "../api/profile";
import { supabase } from "../lib/supabase";
import LegalModal from "./LegalModal";

export default function ProfileModal({ profile, token, userEmail, onSave, onClose, isPro, onUpgrade }) {
  const [form, setForm] = useState({
    business_name: profile?.business_name ?? "",
    bio: profile?.bio ?? "",
    website: profile?.website ?? "",
    payment_url: profile?.payment_url ?? "",
    address: profile?.address ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
    logo_url: profile?.logo_url ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [legal, setLegal] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userEmail?.replace(/[^a-z0-9]/gi, "_")}/logo.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      set("logo_url", data.publicUrl);
    }
    setLogoUploading(false);
  };

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
            <label className="field-label">Logo (appears on PDF) {!isPro && <span style={{ fontSize: 9, background: "var(--accent)", color: "#fff", borderRadius: 3, padding: "1px 5px", marginLeft: 4, letterSpacing: "0.05em" }}>PRO</span>}</label>
            {isPro ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {form.logo_url && (
                  <img src={form.logo_url} alt="Logo" style={{ height: 36, maxWidth: 80, objectFit: "contain", borderRadius: 4, border: "1px solid var(--border)" }} />
                )}
                <button type="button" className="btn btn-ghost" style={{ fontSize: 10, padding: "6px 12px" }} onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                  {logoUploading ? "Uploading..." : form.logo_url ? "Change Logo" : "Upload Logo"}
                </button>
                {form.logo_url && (
                  <button type="button" className="btn-icon" style={{ fontSize: 11 }} onClick={() => set("logo_url", "")}>✕</button>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
              </div>
            ) : (
              <button type="button" className="btn btn-ghost" style={{ fontSize: 10, padding: "6px 12px" }} onClick={onUpgrade}>
                ⚡ Upgrade to Pro to add your logo
              </button>
            )}
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, display: "block" }}>PNG or JPG, ideally under 500 KB</span>
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

        <div className="modal-footer" style={{ flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>
            <button onClick={() => setLegal("terms")} style={{ background: "none", border: "none", color: "var(--text-muted)", textDecoration: "underline", cursor: "pointer", fontSize: 10, padding: 0 }}>Terms of Service</button>
            {" · "}
            <button onClick={() => setLegal("privacy")} style={{ background: "none", border: "none", color: "var(--text-muted)", textDecoration: "underline", cursor: "pointer", fontSize: 10, padding: 0 }}>Privacy Policy</button>
          </div>
        </div>
      </div>

      {legal && <LegalModal type={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}
