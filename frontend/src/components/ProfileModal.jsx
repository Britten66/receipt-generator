/*
  ProfileModal.jsx — the modal where the user edits their business profile.

  Props:
    profile     — the current profile object loaded from the database (or {} if none yet)
    userEmail   — the user's login email address, used in the Security section
    onSave(result) — called after the profile is saved, passing back the updated profile
    onClose()      — called when the user clicks Cancel or clicks outside the modal

  The profile stores:
    business_name, bio, website, payment_url, address, email, phone, logo_url,
    tax_rate, tax_label

  The logo is uploaded to Supabase Storage under the "logos" bucket.
  After uploading, we store the public URL in form.logo_url, which gets saved to the database.
*/

import { useState, useRef } from "react";
import { saveProfile } from "../api/profile";
import { uploadLogo } from "../api/uploadLogo";
import { deleteAccount } from "../api/account";
import { supabase } from "../lib/supabase";
import LegalModal from "./LegalModal";

export default function ProfileModal({ profile, userEmail, onSave, onClose }) {

  /*
    form — the editable fields.

    We use profile?.field ?? "" to safely read from the profile object.
    If profile is null or doesn't have the field, we fall back to an empty string.

    Written out as explicit checks here so you can see exactly where each value comes from.
  */
  function getInitialForm() {
    // Start with an empty object, then fill in each field from the profile if it exists
    const initial = {
      business_name: "",
      bio: "",
      website: "",
      payment_url: "",
      address: "",
      email: "",
      phone: "",
      logo_url: "",
      avatar_url: "",
      tax_rate:  "",
      tax_label: "",
    };

    if (profile) {
      if (profile.business_name) { initial.business_name = profile.business_name; }
      if (profile.bio)           { initial.bio           = profile.bio; }
      if (profile.website)       { initial.website       = profile.website; }
      if (profile.payment_url)   { initial.payment_url   = profile.payment_url; }
      if (profile.address)       { initial.address       = profile.address; }
      if (profile.email)         { initial.email         = profile.email; }
      if (profile.phone)         { initial.phone         = profile.phone; }
      if (profile.logo_url)      { initial.logo_url      = profile.logo_url; }
      if (profile.avatar_url)    { initial.avatar_url    = profile.avatar_url; }
      // tax_rate is a number so check !== undefined rather than truthiness (0 would be falsy)
      if (profile.tax_rate  !== undefined && profile.tax_rate  !== null) { initial.tax_rate  = (profile.tax_rate * 100).toString(); }
      if (profile.tax_label !== undefined && profile.tax_label !== null) { initial.tax_label = profile.tax_label; }
    }

    return initial;
  }

  const [form, setForm] = useState(getInitialForm());

  // saving — true while the API call is in progress (disables the Save button)
  const [saving, setSaving] = useState(false);

  // resetSent — true after the user clicks "Reset Password" (shows a confirmation message)
  const [resetSent, setResetSent] = useState(false);

  // resetLoading — true while the password reset email is being sent (disables the button)
  const [resetLoading, setResetLoading] = useState(false);

  // deleting — true while the delete-account request is in flight
  const [deleting, setDeleting] = useState(false);

  // legal — either "terms" or "privacy" when a legal modal is open, or null when closed
  const [legal, setLegal] = useState(null);

const [logoUploading,   setLogoUploading]   = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const logoInputRef   = useRef(null);
  const avatarInputRef = useRef(null);

  /*
    setField(fieldName, value) — update one field in the form state.

    Arguments:
      fieldName — the name of the field to change (e.g. "business_name", "phone")
      value     — the new value typed by the user

    The spread ...currentForm copies all the existing fields,
    then [fieldName]: value overwrites just the one that changed.

    Example: setField("phone", "(902) 555-0100")
      → form becomes { ...currentForm, phone: "(902) 555-0100" }
  */
  function setField(fieldName, value) {
    setForm((currentForm) => ({ ...currentForm, [fieldName]: value }));
  }

  async function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    const freshUrl = await uploadLogo({ file, userEmail, type: "logo" });
    if (freshUrl) {
      setField("logo_url", freshUrl);
      const updated = { ...form, logo_url: freshUrl };
      await saveProfile(updated);
      onSave(updated);
    }
    setLogoUploading(false);
    event.target.value = "";
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    const freshUrl = await uploadLogo({ file, userEmail, type: "avatar" });
    if (freshUrl) {
      setField("avatar_url", freshUrl);
      const updated = { ...form, avatar_url: freshUrl };
      await saveProfile(updated);
      onSave(updated);
    }
    setAvatarUploading(false);
    event.target.value = "";
  }

  /*
    handleSave() — called when the user clicks "Save Profile".

    tax_rate is stored in the form as a percentage string e.g. "15" for 15%.
    We convert it back to a decimal (0.15) before saving to the database.
    If the user left it blank we save null so ReceiptForm falls back to its default.
  */
  async function handleSave() {
    setSaving(true);
    const dataToSave = {
      ...form,
      tax_rate: form.tax_rate !== "" ? parseFloat(form.tax_rate) / 100 : null,
    };
    const result = await saveProfile(dataToSave);
    setSaving(false);
    onSave(result);
    onClose();
  }

  /*
    handleResetPassword() — sends a password reset email to the user's email address.
    Uses Supabase Auth's built-in reset flow.
    After the email is sent, we set resetSent = true to show a confirmation message.
  */
  async function handleResetPassword() {
    // Don't try to send a reset if we don't have an email to send it to
    if (!userEmail) return;

    setResetLoading(true);
    await supabase.auth.resetPasswordForEmail(userEmail, {
      // After clicking the link, the user is sent back to our site
      redirectTo: window.location.origin,
    });
    setResetLoading(false);
    setResetSent(true);
  }

  /*
    handleBackdropClick(event) — closes the modal when the user clicks outside it.

    event.target      — the element that was actually clicked
    event.currentTarget — the element the handler is attached to (the backdrop)

    If the user clicked on the backdrop itself (not the modal box inside it),
    both target and currentTarget are the same element — that means "clicked outside".
  */
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  /*
    handleDeleteAccount() — permanently deletes all user data and the account.
    Requires the user to type "DELETE" to confirm. Irreversible.
    After deletion the auth session is cleared and the user lands on the sign-in screen.
  */
  async function handleDeleteAccount() {
    const input = window.prompt(
      'This will permanently delete your account and all invoices.\n\nType DELETE to confirm:'
    );
    if (input !== "DELETE") return;
    setDeleting(true);
    try {
      await deleteAccount();
      // Session is now invalid — sign out locally so the app resets cleanly
      await supabase.auth.signOut();
    } catch (err) {
      alert(err.message || "Could not delete account. Please try again.");
      setDeleting(false);
    }
  }

  /*
    Determine the label for the logo button.

    Three possible states:
      1. "Uploading..."  — currently in the middle of an upload
      2. "Change Logo"   — upload is done and there's already a logo
      3. "Upload Logo"   — no logo has been set yet
  */
  const logoButtonLabel   = logoUploading   ? "Uploading..." : form.logo_url   ? "Change Logo"   : "Upload Logo";
  const avatarButtonLabel = avatarUploading ? "Uploading..." : form.avatar_url ? "Change Avatar" : "Upload Avatar";

  /*
    Determine the label for the Save button.

    "Saving..." while the API call is in progress.
    "Save Profile" when ready to be clicked.
  */
  let saveButtonLabel;
  if (saving) {
    saveButtonLabel = "Saving...";
  } else {
    saveButtonLabel = "Save Profile";
  }

  /*
    Determine what to show in the Reset Password area.

    If the reset email has already been sent, show a confirmation message.
    Otherwise, show the Reset Password button.
  */
  let resetPasswordElement;
  if (resetSent) {
    resetPasswordElement = (
      <span style={{ fontSize: 10, color: "var(--paid)", letterSpacing: "0.05em" }}>
        Reset link sent ✓
      </span>
    );
  } else {
    resetPasswordElement = (
      <button
        className="btn btn-ghost"
        style={{ fontSize: 10, padding: "4px 10px", flexShrink: 0 }}
        onClick={handleResetPassword}
        disabled={resetLoading}
      >
        {resetLoading ? "..." : "Reset Password"}
      </button>
    );
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal" style={{ maxWidth: 440 }}>

        {/* Modal title bar */}
        <div className="modal-header">
          <span className="modal-title">Profile</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* ---- Business section ---- */}
          <div className="profile-section-label">Business</div>

          <div className="field-group">
            <label className="field-label">Business Name</label>
            <input
              className="field"
              placeholder="Acme Co."
              value={form.business_name}
              onChange={(e) => setField("business_name", e.target.value)}
              autoFocus
            />
          </div>

          {/* Avatar upload — profile picture shown in the app topbar */}
          <div className="field-group">
            <label className="field-label">Avatar</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {form.avatar_url
                ? <img src={form.avatar_url} alt="Avatar" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: "50%", border: "1px solid var(--border)" }} />
                : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--text-muted)" }}>{(userEmail?.[0] ?? "?").toUpperCase()}</div>
              }
              <button type="button" className="btn btn-ghost" style={{ fontSize: 10, padding: "6px 12px" }} onClick={() => avatarInputRef.current.click()} disabled={avatarUploading}>
                {avatarButtonLabel}
              </button>
              {form.avatar_url && (
                <button type="button" className="btn-icon" style={{ fontSize: 11 }} onClick={async () => { setField("avatar_url", null); await saveProfile({ ...form, avatar_url: null }); onSave({ ...form, avatar_url: null }); }}>✕</button>
              )}
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
            </div>
          </div>

          {/* Logo upload — Pro only */}
          <div className="field-group">
            <label className="field-label">Business Logo (appears on PDF)</label>
            {(profile?.tier === "pro" || profile?.tier === "voice") ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {form.logo_url && (
                    <img src={form.logo_url} alt="Logo" style={{ height: 36, maxWidth: 80, objectFit: "contain", border: "1px solid var(--border)" }} />
                  )}
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 10, padding: "6px 12px" }} onClick={() => logoInputRef.current.click()} disabled={logoUploading}>
                    {logoButtonLabel}
                  </button>
                  {form.logo_url && (
                    <button type="button" className="btn-icon" style={{ fontSize: 11 }} onClick={async () => { setField("logo_url", null); await saveProfile({ ...form, logo_url: null }); onSave({ ...form, logo_url: null }); }}>✕</button>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                  PNG with transparent background recommended
                </span>
              </>
            ) : (
              <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "8px 0" }}>
                Pro feature. <button type="button" onClick={onClose} style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Upgrade to Pro</button> to add your logo to every invoice and PDF.
              </div>
            )}
          </div>

          <div className="field-group">
            <label className="field-label">Bio / Tagline</label>
            <input className="field" placeholder="Freelance developer · React & Node" value={form.bio} onChange={(e) => setField("bio", e.target.value)} />
          </div>

          <div className="field-group">
            <label className="field-label">Website</label>
            <input className="field" placeholder="https://yoursite.com" value={form.website} onChange={(e) => setField("website", e.target.value)} />
          </div>

          <div className="field-group">
            <label className="field-label">Payment Link</label>
            <input className="field" placeholder="https://buy.stripe.com/... or paypal.me/..." value={form.payment_url} onChange={(e) => setField("payment_url", e.target.value)} />
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
              Paste your Stripe Payment Link or PayPal.me — a QR code will appear on unpaid invoices
            </span>
          </div>

          {/* ---- Tax section ---- */}
          <div className="profile-section-label" style={{ marginTop: 16 }}>Tax</div>

          <div className="field-row">
            <div className="field-group">
              <label className="field-label">Tax Label</label>
              <input
                className="field"
                placeholder="GST, VAT, HST, Sales Tax..."
                value={form.tax_label}
                onChange={(e) => setField("tax_label", e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Rate (%)</label>
              <input
                className="field"
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0"
                max="100"
                placeholder="e.g. 15"
                value={form.tax_rate}
                onChange={(e) => setField("tax_rate", e.target.value)}
              />
            </div>
          </div>
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
            Applied to all new invoices. Leave blank for no tax.
          </span>

          {/* ---- Contact section ---- */}
          <div className="profile-section-label" style={{ marginTop: 16 }}>Contact</div>

          <div className="field-group">
            <label className="field-label">Address</label>
            <input className="field" placeholder="123 Main St, City, Province/State" value={form.address} onChange={(e) => setField("address", e.target.value)} />
          </div>

          <div className="field-group">
            <label className="field-label">Email</label>
            <input className="field" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </div>

          <div className="field-group">
            <label className="field-label">Phone</label>
            <input className="field" placeholder="+1 555 000 0000" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
          </div>

          {/* ---- Security section ---- */}
          <div className="profile-section-label" style={{ marginTop: 16 }}>Security</div>


          {/*
            Row showing the account email on the left and the reset button (or confirmation) on the right.
            resetPasswordElement was determined above — either a button or a confirmation message.
          */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text)" }}>{userEmail}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Account email</div>
            </div>
            {resetPasswordElement}
          </div>
          {/* ---- Danger Zone ---- */}
          <div style={{ marginTop: 20, padding: "12px 14px", border: "1px solid var(--voided)", borderRadius: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--voided)", marginBottom: 8 }}>Danger Zone</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text)", fontWeight: 500 }}>Delete my account</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Permanently deletes all invoices and account data. Cannot be undone.</div>
              </div>
              <button
                className="btn btn-danger"
                style={{ flexShrink: 0, fontSize: 10, padding: "6px 12px" }}
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete Account"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer — Save/Cancel buttons and legal links */}
        <div className="modal-footer" style={{ flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saveButtonLabel}
            </button>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>
            <button onClick={() => setLegal("terms")} style={{ background: "none", border: "none", color: "var(--text-muted)", textDecoration: "underline", cursor: "pointer", fontSize: 10, padding: 0 }}>
              Terms of Service
            </button>
            {" · "}
            <button onClick={() => setLegal("privacy")} style={{ background: "none", border: "none", color: "var(--text-muted)", textDecoration: "underline", cursor: "pointer", fontSize: 10, padding: 0 }}>
              Privacy Policy
            </button>
          </div>
        </div>
      </div>

      {/* Show the legal modal (Terms or Privacy) when the user clicks one of the links above */}
      {legal && <LegalModal type={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}