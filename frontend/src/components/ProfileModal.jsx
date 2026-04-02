/*
  ProfileModal.jsx — the modal where the user edits their business profile.

  Props:
    profile     — the current profile object loaded from the database (or {} if none yet)
    userEmail   — the user's login email address, used in the Security section
    onSave(result) — called after the profile is saved, passing back the updated profile
    onClose()      — called when the user clicks Cancel or clicks outside the modal

  The profile stores:
    business_name, bio, website, payment_url, address, email, phone, logo_url

  The logo is uploaded to Supabase Storage under the "logos" bucket.
  After uploading, we store the public URL in form.logo_url, which gets saved to the database.
*/

import { useState, useRef } from "react";
import { saveProfile } from "../api/profile";
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
    };

    // If the profile object exists and has a value for each field, use it
    // Otherwise, keep the empty string from above
    if (profile) {
      if (profile.business_name) { initial.business_name = profile.business_name; }
      if (profile.bio)           { initial.bio           = profile.bio; }
      if (profile.website)       { initial.website       = profile.website; }
      if (profile.payment_url)   { initial.payment_url   = profile.payment_url; }
      if (profile.address)       { initial.address       = profile.address; }
      if (profile.email)         { initial.email         = profile.email; }
      if (profile.phone)         { initial.phone         = profile.phone; }
      if (profile.logo_url)      { initial.logo_url      = profile.logo_url; }
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

  // legal — either "terms" or "privacy" when a legal modal is open, or null when closed
  const [legal, setLegal] = useState(null);

  // logoUploading — true while the logo file is being uploaded to Supabase Storage
  const [logoUploading, setLogoUploading] = useState(false);

  // logoInputRef — a reference to the hidden file input, so we can trigger it from a button click
  const logoInputRef = useRef(null);

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

  /*
    handleLogoUpload(event) — called when the user selects a file in the hidden file input.

    Steps:
      1. Get the selected file from the event
      2. Extract the file extension (e.g. "png", "jpg")
      3. Build a storage path like "user_at_example_com/logo.png"
      4. Upload the file to the "logos" Supabase Storage bucket
      5. If the upload succeeds, get the public URL and save it to form.logo_url
  */
  async function handleLogoUpload(event) {
    // Get the first (and only) file the user selected
    // event.target.files is an array-like object, index 0 is the first file
    const file = event.target.files[0];

    // If the user cancelled the file picker, files[0] is undefined — stop here
    if (!file) return;

    setLogoUploading(true);

    // Extract the file extension from the filename
    // "mylogo.PNG".split(".") → ["mylogo", "PNG"]
    // .pop() takes the last element → "PNG"
    const fileExtension = file.name.split(".").pop();

    // Build a unique storage path for this user
    // Replace any non-alphanumeric characters in the email with underscores
    // so the path is safe to use as a folder name
    // Example: "user@example.com" → "user_example_com"
    let safeEmail = "";
    if (userEmail) {
      safeEmail = userEmail.replace(/[^a-z0-9]/gi, "_");
    }
    const storagePath = `${safeEmail}/logo.${fileExtension}`;

    // Upload the file to Supabase Storage
    // { upsert: true } means it will overwrite any existing file at that path
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(storagePath, file, { upsert: true });

    // Only update the form if the upload succeeded
    if (!uploadError) {
      // getPublicUrl returns the full public URL to the uploaded file
      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(storagePath);
      setField("logo_url", urlData.publicUrl);
    }

    setLogoUploading(false);
  }

  /*
    handleSave() — called when the user clicks "Save Profile".
    Sends the form data to the API and then calls onSave with the result.
  */
  async function handleSave() {
    setSaving(true);
    const result = await saveProfile(form);
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
    Determine the label for the logo button.

    Three possible states:
      1. "Uploading..."  — currently in the middle of an upload
      2. "Change Logo"   — upload is done and there's already a logo
      3. "Upload Logo"   — no logo has been set yet
  */
  let logoButtonLabel;
  if (logoUploading) {
    logoButtonLabel = "Uploading...";
  } else if (form.logo_url) {
    logoButtonLabel = "Change Logo";
  } else {
    logoButtonLabel = "Upload Logo";
  }

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

          {/* Logo upload */}
          <div className="field-group">
            <label className="field-label">Logo (appears on PDF)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

              {/* Show a preview of the current logo if one has been set */}
              {form.logo_url && (
                <img
                  src={form.logo_url}
                  alt="Logo"
                  style={{ height: 36, maxWidth: 80, objectFit: "contain", borderRadius: 0, border: "1px solid var(--border)" }}
                />
              )}

              {/* This button triggers the hidden file input below */}
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 10, padding: "6px 12px" }}
                onClick={() => logoInputRef.current.click()}
                disabled={logoUploading}
              >
                {logoButtonLabel}
              </button>

              {/* Show a remove button only if a logo is already set */}
              {form.logo_url && (
                <button
                  type="button"
                  className="btn-icon"
                  style={{ fontSize: 11 }}
                  onClick={() => setField("logo_url", "")}
                >
                  ✕
                </button>
              )}

              {/* Hidden file input — triggered by the button above */}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleLogoUpload}
              />
            </div>
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
              PNG or JPG, ideally under 500 KB
            </span>
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
              Paste your Stripe Payment Link or PayPal.me — a QR code will appear on unpaid receipts
            </span>
          </div>

          {/* ---- Contact section ---- */}
          <div className="profile-section-label" style={{ marginTop: 16 }}>Contact</div>

          <div className="field-group">
            <label className="field-label">Address</label>
            <input className="field" placeholder="123 Main St, Halifax, NS" value={form.address} onChange={(e) => setField("address", e.target.value)} />
          </div>

          <div className="field-group">
            <label className="field-label">Email</label>
            <input className="field" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setField("email", e.target.value)} />
          </div>

          <div className="field-group">
            <label className="field-label">Phone</label>
            <input className="field" placeholder="(902) 555-0100" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
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
