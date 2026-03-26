import { useState } from "react";
import { saveProfile } from "../api/profile";

export default function ProfileModal({ profile, token, onSave, onClose }) {
  const [form, setForm] = useState({
    business_name: profile?.business_name ?? "",
    address: profile?.address ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const result = await saveProfile(form, token);
    setSaving(false);
    onSave(result);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Business Profile</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">Business Name</label>
            <input className="field" placeholder="Acme Co." value={form.business_name} onChange={(e) => set("business_name", e.target.value)} autoFocus />
          </div>
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
