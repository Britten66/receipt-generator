import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { downloadReceiptPDF, shareReceiptPDF } from "./components/ReceiptPDF";
import {
  fetchReceipts,
  fetchReceiptById,
  createReceipt,
  updateReceipt,
  deleteReceipt,
} from "./api/receipts";
import ReceiptForm from "./components/ReceiptForm";
import LandingPage from "./components/LandingPage";
import AuthModal from "./components/AuthModal";
import ProfileModal from "./components/ProfileModal";
import PasswordUpdateModal from "./components/PasswordUpdateModal";
import { supabase } from "./lib/supabase";
import { fetchProfile } from "./api/profile";
import { QRCodeSVG } from "qrcode.react";
import md5 from "md5";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import "./App.css";

const STATUS_CONFIG = {
  draft: { label: "Draft" },
  sent: { label: "Sent" },
  paid: { label: "Paid" },
  voided: { label: "Voided" },
};

const NAV = [
  { key: "ALL", label: "All Receipts" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "paid", label: "Paid" },
  { key: "voided", label: "Voided" },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const [entered, setEntered] = useState(() => !!localStorage.getItem("app_entered"));
  const [swipedId, setSwipedId] = useState(null);
  const touchStartX = useRef(0);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);

  // Controls the modal and passes data if editing
  const [profile, setProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);

  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth.signInAnonymously().then(({ data }) => {
          setSession(data.session);
          setAuthLoading(false);
        });
      } else {
        setSession(session);
        setAuthLoading(false);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setShowPasswordUpdate(true);
        setSession(newSession);
        return;
      }
      if (!newSession) {
        supabase.auth.signInAnonymously().then(({ data }) => setSession(data.session));
      } else {
        setSession(newSession);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const token = session.access_token;
    setLoading(true);
    fetchReceipts(token)
      .then((d) => setReceipts(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
    if (!session.user.is_anonymous) {
      fetchProfile(token).then((p) => setProfile(p ?? null));
    }
  }, [session]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(STATUS_CONFIG).map((s) => [
          s,
          receipts.filter((r) => r.status === s).length,
        ]),
      ),
    [receipts],
  );

  const revenue = receipts
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + parseFloat(r.subtotal || 0), 0);

  const outstanding = receipts
    .filter((r) => r.status === "sent")
    .reduce((s, r) => s + parseFloat(r.total || 0), 0);

  const filtered = useMemo(
    () =>
      filter === "ALL" ? receipts : receipts.filter((r) => r.status === filter),
    [receipts, filter],
  );

  const token = session?.access_token ?? null;

  const selectFull = async (id) => {
    const full = await fetchReceiptById(id, token);
    setSelected(full);
  };

  const handleSaveReceipt = async (data) => {
    try {
      if (data.id) {
        const result = await updateReceipt(data.id, data, token);
        if (result?.error) throw new Error(result.error);
        setReceipts((prev) => prev.map((r) => (r.id === data.id ? result : r)));
        await selectFull(data.id);
        showToast("Receipt updated.", "success");
      } else {
        const result = await createReceipt(data, token);
        if (result?.error) throw new Error(result.error);
        setReceipts((prev) => [result, ...prev]);
        showToast("Receipt created.", "success");
      }
      setShowForm(false);
      setEditingReceipt(null);
    } catch (err) {
      showToast(err.message ?? "Failed to save. Check all fields.");
    }
  };

  const STATUS_LABELS = {
    draft: "Saved as draft",
    sent: "Marked as sent",
    paid: "Marked as paid",
    voided: "Receipt voided",
  };

  const handleStatusChange = async (id, status) => {
    await updateReceipt(id, { status }, token);
    setReceipts((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
    if (selected?.id === id) setSelected((s) => ({ ...s, status }));
    showToast(STATUS_LABELS[status] ?? `Status → ${status}`, "success");
  };

  const handleDelete = async (id) => {
    const r = receipts.find((r) => r.id === id);
    if (!window.confirm(`Delete receipt ${r?.receipt_number}?`)) return;
    await deleteReceipt(id, token);
    setReceipts((prev) => prev.filter((r) => r.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const openNewReceipt = () => {
    setEditingReceipt(null);
    setShowForm(true);
  };

  const openEditReceipt = (receipt) => {
    setEditingReceipt(receipt);
    setShowForm(true);
  };

  // Keep status in sync with the list but preserve line_items from full fetch
  const selectedReceipt = selected
    ? { ...selected, status: receipts.find((r) => r.id === selected.id)?.status ?? selected.status }
    : null;

  const isAnon = session?.user?.is_anonymous ?? true;

  if (authLoading) return null;

  if (!entered) return (
    <LandingPage onEnter={() => {
      localStorage.setItem("app_entered", "1");
      setEntered(true);
    }} />
  );

  return (
    <div className={`app-shell${isAnon ? " has-ticker" : ""}`}>
      {isAnon && (
        <div className="ticker-bar">
          <span className="ticker-static">
            Auto-fill your business profile —{" "}
            <button className="ticker-link" onClick={() => setShowAuthModal(true)}>
              create an account here
            </button>
          </span>
        </div>
      )}
      <header className={`topbar${isAnon ? " topbar-guest" : ""}`}>
        <div className="topbar-meta">
          {new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}
        </div>
        <div className="topbar-right">
          {!isAnon && (() => {
            const email = session?.user?.email ?? "";
            const hash = email ? md5(email.trim().toLowerCase()) : null;
            const avatarUrl = hash ? `https://www.gravatar.com/avatar/${hash}?s=56&d=identicon` : null;
            return (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="avatar-btn" aria-label="User menu">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" width={28} height={28} style={{ borderRadius: "50%", display: "block" }} />
                      : <div className="avatar-fallback">{email[0]?.toUpperCase()}</div>
                    }
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="dropdown-content" sideOffset={8} align="end">
                    <div className="dropdown-label">{email}</div>
                    <DropdownMenu.Separator className="dropdown-sep" />
                    <DropdownMenu.Item className="dropdown-item" onSelect={() => setShowProfileModal(true)}>
                      Profile &amp; Settings
                    </DropdownMenu.Item>
                    <DropdownMenu.Item className="dropdown-item dropdown-item-danger" onSelect={() => supabase.auth.signOut()}>
                      Sign Out
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            );
          })()}
        </div>
      </header>

      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="stat-block">
            <div className="stat-label">Revenue <span className="stat-sublabel">paid · excl. tax</span></div>
            <div className="stat-value">${revenue.toFixed(2)}</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Outstanding <span className="stat-sublabel">sent · incl. tax</span></div>
            <div className="stat-value">${outstanding.toFixed(2)}</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Receipts</div>
            <div className="stat-value">{receipts.length}</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">View</div>
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`sidebar-item${filter === n.key ? " active" : ""}`}
              onClick={() => setFilter(n.key)}
            >
              {n.label}
              <span className="sidebar-count">
                {n.key === "ALL" ? receipts.length : (counts[n.key] ?? 0)}
              </span>
            </button>
          ))}
        </div>

        <div
          style={{
            marginTop: "auto",
            padding: 12,
            borderTop: "1px solid var(--border-light)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {isAnon ? (
            <button
              className="btn btn-ghost"
              style={{ width: "100%", fontSize: 10, letterSpacing: "0.1em" }}
              onClick={() => setShowAuthModal(true)}
            >
              Save receipts  ·  Create account
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              style={{ width: "100%", fontSize: 10, letterSpacing: "0.1em" }}
              onClick={() => setShowProfileModal(true)}
            >
              {profile?.business_name ? `✎ ${profile.business_name}` : "+ Add Business Profile"}
            </button>
          )}
          <button
            className="btn btn-primary"
            style={{ width: "100%" }}
            onClick={openNewReceipt}
          >
            + New Receipt
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="toolbar">
          {!isAnon && (() => {
            const h = new Date().getHours();
            const salutation = h >= 5 && h < 12 ? "Good morning" : h >= 12 && h < 17 ? "Good afternoon" : "Good evening";
            const name = profile?.business_name || session?.user?.email?.split("@")[0] || "";
            return <span className="toolbar-greeting">{name ? `${salutation}, ${name}` : salutation}</span>;
          })()}
          <span className="toolbar-title">
            {filter === "ALL" ? "All" : STATUS_CONFIG[filter]?.label} —{" "}
            {filtered.length} receipt{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="content-area">
          <div className="receipt-grid-wrap">
            {loading ? (
              <div className="empty">Loading...</div>
            ) : (
              <div className="receipt-grid">
                {filtered.length === 0 ? (
                  <div className="empty">No receipts found</div>
                ) : (
                  filtered.map((r) => (
                    <div key={r.id} className="swipe-wrapper">
                      <button
                        className="swipe-delete-btn"
                        onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                      >
                        Delete
                      </button>
                      <div
                        className={`receipt-card${selectedReceipt?.id === r.id ? " selected" : ""}${swipedId === r.id ? " swiped" : ""}`}
                        onTouchStart={(e) => {
                          touchStartX.current = e.touches[0].clientX;
                        }}
                        onTouchMove={(e) => {
                          const dx = e.touches[0].clientX - touchStartX.current;
                          const base = swipedId === r.id ? -76 : 0;
                          const clamped = Math.max(Math.min(base + dx, 0), -76);
                          e.currentTarget.style.transition = "none";
                          e.currentTarget.style.transform = `translateX(${clamped}px)`;
                        }}
                        onTouchEnd={(e) => {
                          const dx = e.changedTouches[0].clientX - touchStartX.current;
                          e.currentTarget.style.transition = "";
                          e.currentTarget.style.transform = "";
                          if (swipedId === r.id) {
                            if (dx > 30) setSwipedId(null);
                          } else {
                            if (dx < -40) setSwipedId(r.id);
                          }
                        }}
                        onClick={() => {
                          if (swipedId === r.id) { setSwipedId(null); return; }
                          selectFull(r.id);
                        }}
                      >
                        <div className="card-top-row">
                          <span className="card-num">{r.receipt_number}</span>
                          <button
                            className="card-delete"
                            onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                            title="Delete"
                          >✕</button>
                        </div>
                        <div className="card-vendor">{r.customer_name}</div>
                        <div className="card-customer">{r.vendor_name}</div>
                        <div className="card-footer">
                          <span className={`stamp ${r.status}`}>{r.status}</span>
                          <span className="card-total">
                            ${parseFloat(r.total).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedReceipt && (
            <div className="detail-panel">
              <div className="detail-header">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div className="detail-receipt-num">
                      Receipt / {selectedReceipt.receipt_number}
                    </div>
                    <div className="detail-vendor">
                      {selectedReceipt.vendor_name}
                    </div>
                    <div className="detail-customer">
                      Issued to: {selectedReceipt.customer_name}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="btn-icon close-btn"
                  >
                    ✕
                  </button>
                </div>
                {/* NEW EDIT BUTTON */}
                <button
                  className="btn btn-ghost"
                  style={{
                    width: "100%",
                    marginTop: 12,
                    border: "1px solid var(--border)",
                  }}
                  onClick={() => openEditReceipt(selectedReceipt)}
                >
                  ✎ Edit Details
                </button>
              </div>

              <div className="detail-section">
                <div className="detail-row">
                  <span className="detail-key">Status</span>
                  <span className={`stamp ${selectedReceipt.status}`}>
                    {selectedReceipt.status}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Date</span>
                  <span className="detail-val">
                    {selectedReceipt.date
                      ? new Date(selectedReceipt.date).toLocaleDateString(
                          "en-CA",
                        )
                      : "—"}
                  </span>
                </div>
                {selectedReceipt.notes && (
                  <div
                    className="detail-row"
                    style={{ alignItems: "flex-start", gap: 12, marginTop: 4 }}
                  >
                    <span className="detail-key">Notes</span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-dim)",
                        textAlign: "right",
                        maxWidth: 180,
                      }}
                    >
                      {selectedReceipt.notes}
                    </span>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <table className="line-items-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style={{ textAlign: "right" }}>Qty</th>
                      <th style={{ textAlign: "right" }}>Unit</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReceipt.line_items?.length ? (
                      selectedReceipt.line_items.map((li) => (
                        <tr key={li.id}>
                          <td>{li.description}</td>
                          <td className="number">{li.quantity}</td>
                          <td className="number">
                            ${parseFloat(li.unit_price).toFixed(2)}
                          </td>
                          <td className="number">
                            ${parseFloat(li.total).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            color: "var(--text-muted)",
                            paddingTop: 10,
                            fontSize: 9,
                            letterSpacing: "0.15em",
                          }}
                        >
                          No line items
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div style={{ marginTop: 12 }}>
                  <div className="total-line">
                    <span className="tl-label">Subtotal</span>
                    <span className="tl-val">
                      ${parseFloat(selectedReceipt.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="total-line">
                    <span className="tl-label">Tax</span>
                    <span className="tl-val">
                      ${parseFloat(selectedReceipt.tax || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="total-line grand">
                    <span className="tl-label">Total</span>
                    <span className="tl-val">
                      ${parseFloat(selectedReceipt.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <div className="stat-label" style={{ marginBottom: 8 }}>
                  Update Status
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {Object.keys(STATUS_CONFIG)
                    .filter((s) => s !== selectedReceipt.status)
                    .map((s) => (
                      <button
                        key={s}
                        className="btn btn-status"
                        onClick={() =>
                          handleStatusChange(selectedReceipt.id, s)
                        }
                      >
                        → {s}
                      </button>
                    ))}
                </div>
              </div>

              {profile?.payment_url && !["paid", "voided"].includes(selectedReceipt.status) && (
                <div className="detail-section" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "16px 14px" }}>
                  <QRCodeSVG
                    value={profile.payment_url}
                    size={130}
                    bgColor="#ffffff"
                    fgColor="#111110"
                    level="M"
                  />
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", letterSpacing: "0.05em" }}>
                    Scan to pay · ${parseFloat(selectedReceipt.total || 0).toFixed(2)}
                  </div>
                </div>
              )}

              <div className="detail-section">
                {"share" in navigator && (
                  <button
                    className="btn btn-ghost"
                    style={{ width: "100%", marginBottom: 6 }}
                    onClick={() => shareReceiptPDF(selectedReceipt)}
                  >
                    ↑ Share Receipt
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", marginBottom: 6 }}
                  onClick={() => downloadReceiptPDF(selectedReceipt)}
                >
                  ↓ Download PDF
                </button>
                <button
                  className="btn btn-danger"
                  style={{ width: "100%" }}
                  onClick={() => handleDelete(selectedReceipt.id)}
                >
                  Delete Receipt
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <ReceiptForm
          initialData={editingReceipt}
          profile={profile}
          onSubmit={handleSaveReceipt}
          onClose={() => setShowForm(false)}
        />
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {showPasswordUpdate && (
        <PasswordUpdateModal onClose={() => setShowPasswordUpdate(false)} />
      )}

      {showProfileModal && (
        <ProfileModal
          profile={profile}
          token={token}
          userEmail={session?.user?.email}
          onSave={(p) => setProfile(p)}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background:
              toast.type === "success" ? "var(--paid)" : "var(--voided)",
            color: "#fff",
            padding: "10px 20px",
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontFamily: "var(--mono)",
            zIndex: 500,
            border: "1px solid rgba(0,0,0,0.2)",
            boxShadow: "2px 2px 0 rgba(0,0,0,0.15)",
            whiteSpace: "nowrap",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
