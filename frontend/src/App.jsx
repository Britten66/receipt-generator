/*
  App.jsx — the main app shell.

  This file handles:
  - Auth state (Supabase session, anonymous vs signed-in user)
  - Loading receipts from the API
  - Showing the sidebar, receipt list, and detail panel
  - Opening modals (new receipt, edit receipt, profile, auth)

  Layout on desktop:
    topbar (full width)
    sidebar | receipt grid | detail panel (when a receipt is selected)

  Layout on mobile:
    topbar
    sidebar becomes a stats + filter strip at the top
    receipt grid scrolls below
    detail panel takes over full screen when a receipt is tapped
*/

import { useState, useMemo, useEffect, useRef } from "react";
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
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import "./App.css";

/*
  STATUS_CONFIG lists the four states a receipt can be in.
  Used to build the sidebar nav and the status-change buttons in the detail panel.

  Example:
    status = "draft"   → receipt is saved but not sent yet
    status = "sent"    → receipt has been sent to the client
    status = "paid"    → client has paid, counts toward revenue
    status = "voided"  → cancelled, excluded from all stats
*/
const STATUS_CONFIG = {
  draft: { label: "Draft" },
  sent:  { label: "Sent" },
  paid:  { label: "Paid" },
  voided:{ label: "Voided" },
};

/*
  NAV is the filter list shown in the sidebar.
  "ALL" shows every receipt regardless of status.
*/
const NAV = [
  { key: "ALL",    label: "All Receipts" },
  { key: "draft",  label: "Draft" },
  { key: "sent",   label: "Sent" },
  { key: "paid",   label: "Paid" },
  { key: "voided", label: "Voided" },
];

/*
  STATUS_LABELS maps a status value to the toast message shown after changing it.
  Example: marking a receipt as paid shows "Marked as paid" in the toast.
*/
const STATUS_LABELS = {
  draft:  "Saved as draft",
  sent:   "Marked as sent",
  paid:   "Marked as paid",
  voided: "Receipt voided",
};

export default function App() {

  // Supabase session. Null until auth check is done.
  const [session, setSession] = useState(null);

  // True while we wait for Supabase to check if the user is logged in.
  // We render nothing during this time to avoid a flash of wrong UI.
  const [authLoading, setAuthLoading] = useState(true);

  // Controls whether the sign-in / sign-up modal is visible.
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Controls the "set new password" modal shown after the user clicks a password reset link.
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);

  /*
    "entered" tracks whether the user has passed the landing page.
    We store this in localStorage so refreshing the page skips the landing page.
    Value is the string "1" if they have clicked "Start Now", otherwise absent.
  */
  const [entered, setEntered] = useState(() => !!localStorage.getItem("app_entered"));

  // The id of whichever receipt card is currently swiped open (mobile only).
  const [swipedId, setSwipedId] = useState(null);

  // Used to calculate how far the user has swiped a card left.
  const touchStartX = useRef(0);

  // All receipts fetched from the API for the logged-in user.
  const [receipts, setReceipts] = useState([]);

  // True while the receipts are being fetched on first load.
  const [loading, setLoading] = useState(true);

  // Which status tab is active in the sidebar. "ALL" shows everything.
  const [filter, setFilter] = useState("ALL");

  /*
    The currently selected receipt (shown in the detail panel).
    This is the full receipt object including line_items, fetched by ID.
    Null means no receipt is selected and the detail panel is hidden.
  */
  const [selected, setSelected] = useState(null);

  // The logged-in user's profile (business name, contact info, logo, etc.)
  const [profile, setProfile] = useState(null);

  // Controls whether the profile settings modal is open.
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Controls whether the create/edit receipt form modal is open.
  const [showForm, setShowForm] = useState(false);

  /*
    When editing an existing receipt we put it here so the form knows to
    pre-fill the fields. Null when creating a new receipt.
  */
  const [editingReceipt, setEditingReceipt] = useState(null);

  /*
    Toast notification: { msg: string, type: "success" | "error" }
    Shown as a small banner at the bottom of the screen for 3.5 seconds.
    Null means no toast is currently visible.
  */
  const [toast, setToast] = useState(null);

  /*
    sendInvoiceTarget: the receipt we are about to email to the client.
    When set, the email input row replaces the "Send to Client" button.
    Null means the email row is hidden.
  */
  const [sendInvoiceTarget, setSendInvoiceTarget] = useState(null);

  // The email address typed into the send-invoice input.
  const [sendInvoiceEmail, setSendInvoiceEmail] = useState("");

  // True while the email is being sent to prevent double-clicking.
  const [sendingInvoice, setSendingInvoice] = useState(false);

  /*
    showToast(msg, type) — show a temporary banner message.
    type is "success" (green) or "error" (red). Defaults to "error".

    Example:
      showToast("Receipt created.", "success")
      showToast("Failed to save. Check all fields.")
  */
  function showToast(msg, type = "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  /*
    Auth setup — runs once on mount.

    1. Check if a session already exists (e.g. the user refreshed the page).
    2. If no session exists, sign in anonymously so the user can use the app
       without creating an account. Receipts created anonymously are tied to
       the anonymous user_id and will be lost if they clear their browser.
    3. Listen for auth state changes so we can react when the user signs in,
       signs out, or clicks a password reset link.
  */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // No existing session — sign in anonymously
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
        // User clicked a password reset link in their email.
        // Show the "set new password" modal instead of logging them in normally.
        setShowPasswordUpdate(true);
        setSession(newSession);
        return;
      }
      if (!newSession) {
        // Session ended (e.g. signed out) — fall back to anonymous
        supabase.auth.signInAnonymously().then(({ data }) => setSession(data.session));
      } else {
        setSession(newSession);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /*
    Load receipts whenever the session changes (login, logout, anonymous sign-in).
    Also load the profile if the user is not anonymous.
  */
  useEffect(() => {
    if (!session) return;
    const token = session.access_token;
    setLoading(true);
    fetchReceipts(token)
      .then((data) => {
        // The API should always return an array, but we check just in case
        // something goes wrong and it returns null or an error object instead
        if (Array.isArray(data)) {
          setReceipts(data);
        } else {
          setReceipts([]);
        }
      })
      .finally(() => setLoading(false));

    // Only load the profile for real accounts, not anonymous sessions
    if (!session.user.is_anonymous) {
      fetchProfile(token).then((p) => {
        // p can be null if the user hasn't set up their profile yet
        setProfile(p || null);
      });
    }
  }, [session]);

  /*
    counts — how many receipts are in each status.
    Used to show the number badge next to each filter item in the sidebar.

    Example result: { draft: 2, sent: 1, paid: 5, voided: 0 }
  */
  const counts = useMemo(() => {
    const result = {};
    for (const status of Object.keys(STATUS_CONFIG)) {
      result[status] = receipts.filter((r) => r.status === status).length;
    }
    return result;
  }, [receipts]);

  /*
    revenue — total of all PAID receipts, using subtotal (before tax).
    Shown in the sidebar stats block.
  */
  const revenue = receipts
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + parseFloat(r.subtotal || 0), 0);

  /*
    outstanding — total of all SENT receipts (invoiced but not yet paid), including tax.
    Shown in the sidebar stats block.
  */
  const outstanding = receipts
    .filter((r) => r.status === "sent")
    .reduce((sum, r) => sum + parseFloat(r.total || 0), 0);

  /*
    filtered — the receipts shown in the current view.
    When filter is "ALL" every receipt is shown.
    Otherwise only receipts matching the selected status are shown.
  */
  const filtered = useMemo(() => {
    if (filter === "ALL") return receipts;
    return receipts.filter((r) => r.status === filter);
  }, [receipts, filter]);

  // The JWT token from the current session, passed to every API call.
  // If the session doesn't exist yet, token is null.
  let token = null;
  if (session) {
    token = session.access_token;
  }

  /*
    selectFull(id) — fetch a receipt by id (includes line_items) and open the detail panel.
    The list view only has summary data, so we fetch the full object here.
  */
  async function selectFull(id) {
    const full = await fetchReceiptById(id, token);
    setSelected(full);
  }

  /*
    handleSaveReceipt(data) — called when the receipt form is submitted.
    If data.id exists we're editing, otherwise we're creating a new receipt.
    On success the list is updated in-place without a full reload.
  */
  async function handleSaveReceipt(data) {
    try {
      if (data.id) {
        // Editing an existing receipt
        const result = await updateReceipt(data.id, data, token);
        if (result?.error) throw new Error(result.error);
        setReceipts((prev) => prev.map((r) => (r.id === data.id ? result : r)));
        await selectFull(data.id); // refresh the detail panel with updated data
        showToast("Receipt updated.", "success");
      } else {
        // Creating a new receipt
        const result = await createReceipt(data, token);
        if (result?.error) throw new Error(result.error);
        setReceipts((prev) => [result, ...prev]); // add to top of list
        showToast("Receipt created.", "success");
      }
      setShowForm(false);
      setEditingReceipt(null);
    } catch (err) {
      // err.message is the specific error from the server, e.g. "duplicate receipt number"
      // If there's no message we fall back to a generic one
      const errorMessage = err.message || "Failed to save. Check all fields.";
      showToast(errorMessage);
    }
  }

  /*
    handleStatusChange(id, status) — change the status of a receipt.
    Updates both the list and the detail panel immediately without a reload.

    Example:
      handleStatusChange("abc-123", "paid")
      → receipt "abc-123" is now marked as paid
      → toast: "Marked as paid"
  */
  async function handleStatusChange(id, status) {
    await updateReceipt(id, { status }, token);
    // Update the status in the list without re-fetching everything
    setReceipts((prev) => prev.map((r) => {
      if (r.id === id) {
        return { ...r, status }; // return a copy of this receipt with the new status
      }
      return r; // all other receipts stay the same
    }));

    // If this receipt is currently open in the detail panel, update that too
    if (selected && selected.id === id) {
      setSelected((s) => ({ ...s, status }));
    }

    // Show a toast message — use the label from STATUS_LABELS, or a generic fallback
    const toastMessage = STATUS_LABELS[status] || "Status updated";
    showToast(toastMessage, "success");
  }

  /*
    handleDelete(id) — delete a receipt after a confirmation dialog.
    Removes it from the list and closes the detail panel if it was selected.
  */
  async function handleDelete(id) {
    // Find the receipt so we can show its number in the confirm dialog
    const receiptToDelete = receipts.find((r) => r.id === id);
    const receiptNumber = receiptToDelete ? receiptToDelete.receipt_number : id;

    // Ask the user to confirm before deleting — this cannot be undone
    const confirmed = window.confirm(`Delete receipt ${receiptNumber}?`);
    if (!confirmed) return;

    await deleteReceipt(id, token);

    // Remove it from the list
    setReceipts((prev) => prev.filter((r) => r.id !== id));

    // If it was open in the detail panel, close the panel
    if (selected && selected.id === id) {
      setSelected(null);
    }
  }

  /*
    handleSendInvoice() — email the selected receipt to the client.
    Calls the /api/send-invoice serverless function which uses Resend to send
    a formatted HTML email with the invoice details and a Pay Now button.

    Requires RESEND_API_KEY to be set in Vercel environment variables.
  */
  async function handleSendInvoice() {
    if (!sendInvoiceEmail) return;
    setSendingInvoice(true);
    try {
      const r = sendInvoiceTarget;
      const res = await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          to: sendInvoiceEmail,
          vendor_name: r.vendor_name,
          customer_name: r.customer_name,
          receipt_number: r.receipt_number,
          date: r.date,
          line_items: r.line_items,
          subtotal: r.subtotal,
          tax: r.tax,
          total: r.total,
          notes: r.notes,
          payment_url: profile?.payment_url, // optional Pay Now link from profile settings
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error);
      }
      showToast("Invoice sent.", "success");
      setSendInvoiceTarget(null);
      setSendInvoiceEmail("");
    } catch (err) {
      const errorMessage = err.message || "Failed to send invoice.";
      showToast(errorMessage);
    }
    setSendingInvoice(false);
  }

  // Open the new receipt form (no pre-filled data).
  function openNewReceipt() {
    setEditingReceipt(null);
    setShowForm(true);
  }

  // Open the form pre-filled with an existing receipt's data for editing.
  function openEditReceipt(receipt) {
    setEditingReceipt(receipt);
    setShowForm(true);
  }

  /*
    selectedReceipt — the full receipt object shown in the detail panel.

    We store two separate things:
      - selected: the full receipt fetched by ID (includes line_items)
      - receipts: the list of summary receipts (status updates here in real time)

    When you click a status button, it updates the receipts list immediately.
    But selected still has the old status from when we fetched it.
    So we merge them: take everything from selected, but use the status from the list.

    If nothing is selected, selectedReceipt is null and the panel is hidden.
  */
  let selectedReceipt = null;
  if (selected) {
    const liveVersion = receipts.find((r) => r.id === selected.id);
    const currentStatus = liveVersion ? liveVersion.status : selected.status;
    selectedReceipt = { ...selected, status: currentStatus };
  }

  /*
    isAnon — true if the user has not signed in and is using an anonymous session.
    Anonymous users can still create receipts, but their data is tied to the browser
    and will be lost if they clear their storage.
    session.user.is_anonymous is set by Supabase when we call signInAnonymously().
    The ?? true fallback handles the case where session is null.
  */
  const isAnon = session && session.user ? session.user.is_anonymous : true;

  // Show nothing while we check if a session exists. Avoids a flash of wrong content.
  if (authLoading) return null;

  // Show the landing page until the user clicks "Start Now".
  if (!entered) {
    return (
      <LandingPage onEnter={() => {
        localStorage.setItem("app_entered", "1");
        setEntered(true);
      }} />
    );
  }

  // The email address of the logged-in user (empty string if anonymous or not loaded yet)
  const userEmail = session && session.user ? session.user.email : "";

  /*
    Avatar image — shown in the top-right dropdown button.
    If the user has uploaded a business logo in their profile, we use that as the avatar.
    Otherwise, the button falls back to showing the first letter of their email.
  */
  let avatarUrl = null;
  if (profile && profile.logo_url) {
    avatarUrl = profile.logo_url;
  }

  /*
    Time-based greeting shown above the receipt list.
    We get the current hour (0-23) and pick the right word.
    Then we add the user's name if we have one.

    Hour ranges:
       5 to 11 = morning
      12 to 16 = afternoon
      17 to  4 = evening (wraps past midnight)

    Name fallback order:
      1. profile.business_name if set in profile settings
      2. The part of their email before the @ sign
      3. Nothing (just show "Good morning" with no name)
  */
  const hour = new Date().getHours();
  let salutation;
  if (hour >= 5 && hour < 12) {
    salutation = "Good morning";
  } else if (hour >= 12 && hour < 17) {
    salutation = "Good afternoon";
  } else {
    salutation = "Good evening";
  }

  // Pick the display name: business name, email username, or empty string
  let greetingName = "";
  if (profile && profile.business_name) {
    greetingName = profile.business_name;
  } else if (userEmail) {
    greetingName = userEmail.split("@")[0];
  }

  // Build the full greeting string
  let greeting;
  if (greetingName) {
    greeting = `${salutation}, ${greetingName}`;
  } else {
    greeting = salutation;
  }

  return (
    <div className="app-shell">

      {/* Top bar: date on the left, avatar dropdown on the right for signed-in users */}
      <header className={`topbar${isAnon ? " topbar-guest" : ""}`}>
        <div className="topbar-meta">
          {new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}
        </div>
        <div className="topbar-right">
          {/* Avatar dropdown — only shown when the user is signed in */}
          {!isAnon && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="avatar-btn" aria-label="User menu">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" width={34} height={34} style={{ display: "block", objectFit: "cover" }} />
                    : <div className="avatar-fallback">{userEmail[0] ? userEmail[0].toUpperCase() : "?"}</div>
                  }
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="dropdown-content" sideOffset={8} align="end">
                  <div className="dropdown-label">{userEmail}</div>
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
          )}
        </div>
      </header>

      {/* Sidebar — stats, filter nav, and the + New Receipt button */}
      <aside className="sidebar">

        {/* Stats block: revenue (paid, pre-tax), outstanding (sent, inc. tax), total count */}
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

        {/* Filter nav — clicking a filter updates the receipt list */}
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

        {/* Bottom of sidebar: profile shortcut and + New Receipt button */}
        <div style={{ marginTop: "auto", padding: 12, borderTop: "1px solid var(--border-light)", display: "flex", flexDirection: "column", gap: 8 }}>
          {isAnon ? (
            <button
              className="btn btn-ghost"
              style={{ width: "100%", fontSize: 10, letterSpacing: "0.1em" }}
              onClick={() => setShowAuthModal(true)}
            >
              Save receipts · Create account
            </button>
          ) : (
            <>
              <button
                className="btn btn-ghost"
                style={{ width: "100%", fontSize: 10, letterSpacing: "0.1em" }}
                onClick={() => setShowProfileModal(true)}
              >
                {profile && profile.business_name ? `✎ ${profile.business_name}` : "+ Add Business Profile"}
              </button>
              <button
                className="btn btn-ghost"
                style={{ width: "100%", fontSize: 10, letterSpacing: "0.1em", color: "var(--text-muted)" }}
                onClick={() => supabase.auth.signOut()}
              >
                Sign Out
              </button>
            </>
          )}
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={openNewReceipt}>
            + New Receipt
          </button>
        </div>
      </aside>

      {/* Main content area: toolbar greeting + receipt grid + optional detail panel */}
      <main className="main">

        {/* Toolbar: greeting on the left, receipt count on the right */}
        <div className="toolbar">
          {!isAnon && (
            <span className="toolbar-greeting">{greeting}</span>
          )}
          <span className="toolbar-title">
            {filter === "ALL" ? "All" : STATUS_CONFIG[filter]?.label} — {filtered.length} receipt{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="content-area">

          {/* Receipt grid — each card shows client name, receipt number, status, total */}
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

                      {/* Mobile swipe-to-delete button (visible after swiping left) */}
                      <button
                        className="swipe-delete-btn"
                        onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                      >
                        Delete
                      </button>

                      <div
                        className={`receipt-card${selectedReceipt?.id === r.id ? " selected" : ""}${swipedId === r.id ? " swiped" : ""}`}
                        onTouchStart={(e) => {
                          // Record where the finger started so we can calculate swipe distance
                          touchStartX.current = e.touches[0].clientX;
                        }}
                        onTouchMove={(e) => {
                          // Move the card left as the user swipes, clamped between -76px and 0
                          const dx = e.touches[0].clientX - touchStartX.current;
                          const base = swipedId === r.id ? -76 : 0;
                          const clamped = Math.max(Math.min(base + dx, 0), -76);
                          e.currentTarget.style.transition = "none";
                          e.currentTarget.style.transform = `translateX(${clamped}px)`;
                        }}
                        onTouchEnd={(e) => {
                          // Snap open (swiped) if moved > 40px left, snap closed if moved > 30px right
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
                          // If the card is swiped open, close it instead of opening the receipt
                          if (swipedId === r.id) { setSwipedId(null); return; }
                          selectFull(r.id);
                        }}
                      >
                        <div className="card-top-row">
                          <span className="card-num">{r.receipt_number}</span>
                          {/* Desktop delete button — only visible on hover */}
                          <button
                            className="card-delete"
                            onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                            title="Delete"
                          >✕</button>
                        </div>
                        {/* Client name shown bold — the most important identifier when scanning a list */}
                        <div className="card-vendor">{r.customer_name}</div>
                        {/* Issuing business name shown smaller below */}
                        <div className="card-customer">{r.vendor_name}</div>
                        <div className="card-footer">
                          <span className={`stamp ${r.status}`}>{r.status}</span>
                          <span className="card-total">${parseFloat(r.total).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Detail panel — shown when a receipt card is tapped/clicked */}
          {selectedReceipt && (
            <div className="detail-panel">

              {/* Header: receipt number, vendor, client, and Edit button */}
              <div className="detail-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="detail-receipt-num">Receipt / {selectedReceipt.receipt_number}</div>
                    <div className="detail-vendor">{selectedReceipt.vendor_name}</div>
                    <div className="detail-customer">Issued to: {selectedReceipt.customer_name}</div>
                  </div>
                  <button onClick={() => setSelected(null)} className="btn-icon close-btn">✕</button>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ width: "100%", marginTop: 12, border: "1px solid var(--border)" }}
                  onClick={() => openEditReceipt(selectedReceipt)}
                >
                  ✎ Edit Details
                </button>
              </div>

              {/* Status and date */}
              <div className="detail-section">
                <div className="detail-row">
                  <span className="detail-key">Status</span>
                  <span className={`stamp ${selectedReceipt.status}`}>{selectedReceipt.status}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Date</span>
                  <span className="detail-val">
                    {selectedReceipt.date
                      ? new Date(selectedReceipt.date).toLocaleDateString("en-CA")
                      : "—"}
                  </span>
                </div>
                {selectedReceipt.notes && (
                  <div className="detail-row" style={{ alignItems: "flex-start", gap: 12, marginTop: 4 }}>
                    <span className="detail-key">Notes</span>
                    <span style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "right", maxWidth: 180 }}>
                      {selectedReceipt.notes}
                    </span>
                  </div>
                )}
              </div>

              {/* Line items table and totals */}
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
                          <td className="number">${parseFloat(li.unit_price).toFixed(2)}</td>
                          <td className="number">${parseFloat(li.total).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ color: "var(--text-muted)", paddingTop: 10, fontSize: 9, letterSpacing: "0.15em" }}>
                          No line items
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Subtotal, tax, and grand total */}
                <div style={{ marginTop: 12 }}>
                  <div className="total-line">
                    <span className="tl-label">Subtotal</span>
                    <span className="tl-val">${parseFloat(selectedReceipt.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="total-line">
                    <span className="tl-label">Tax</span>
                    <span className="tl-val">${parseFloat(selectedReceipt.tax || 0).toFixed(2)}</span>
                  </div>
                  <div className="total-line grand">
                    <span className="tl-label">Total</span>
                    <span className="tl-val">${parseFloat(selectedReceipt.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Status change buttons — shows all statuses except the current one */}
              <div className="detail-section">
                <div className="stat-label" style={{ marginBottom: 8 }}>Update Status</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {Object.keys(STATUS_CONFIG)
                    .filter((s) => s !== selectedReceipt.status)
                    .map((s) => (
                      <button
                        key={s}
                        className="btn btn-status"
                        onClick={() => handleStatusChange(selectedReceipt.id, s)}
                      >
                        {s}
                      </button>
                    ))}
                </div>
              </div>

              {/*
                QR code — only shown when:
                1. The user has set a payment URL in their profile (e.g. a Stripe or PayPal link)
                2. The receipt is not yet paid or voided

                The client can scan this with their phone to pay directly.
              */}
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

              {/* Actions: send to client, share (mobile), download PDF, delete */}
              <div className="detail-section">

                {/*
                  Send to Client: tapping the button reveals an email input.
                  Pressing Enter or clicking "Send Invoice" calls handleSendInvoice().
                  Pressing Cancel hides the input again.
                */}
                {sendInvoiceTarget?.id === selectedReceipt.id ? (
                  <div style={{ marginBottom: 6 }}>
                    <input
                      className="field"
                      type="email"
                      placeholder="Client email address"
                      autoFocus
                      value={sendInvoiceEmail}
                      onChange={(e) => setSendInvoiceEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendInvoice()}
                      style={{ marginBottom: 6 }}
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setSendInvoiceTarget(null); setSendInvoiceEmail(""); }}>Cancel</button>
                      <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSendInvoice} disabled={sendingInvoice}>
                        {sendingInvoice ? "Sending..." : "Send Invoice"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-ghost"
                    style={{ width: "100%", marginBottom: 6 }}
                    onClick={() => { setSendInvoiceTarget(selectedReceipt); setSendInvoiceEmail(""); }}
                  >
                    ✉ Send to Client
                  </button>
                )}

                {/* Share button — only shown on devices that support the Web Share API (iOS/Android) */}
                {"share" in navigator && (
                  <button
                    className="btn btn-ghost"
                    style={{ width: "100%", marginBottom: 6 }}
                    onClick={() => shareReceiptPDF({ ...selectedReceipt, logo_url: profile?.logo_url })}
                  >
                    Share Receipt
                  </button>
                )}

                <button
                  className="btn btn-primary"
                  style={{ width: "100%", marginBottom: 6 }}
                  onClick={() => downloadReceiptPDF({ ...selectedReceipt, logo_url: profile?.logo_url })}
                >
                  Download PDF
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

      {/* Receipt create/edit form modal */}
      {showForm && (
        <ReceiptForm
          initialData={editingReceipt}
          profile={profile}
          onSubmit={handleSaveReceipt}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Sign in / sign up modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {/* "Set new password" modal — shown after clicking a password reset email link */}
      {showPasswordUpdate && (
        <PasswordUpdateModal onClose={() => setShowPasswordUpdate(false)} />
      )}

      {/* Profile / settings modal */}
      {showProfileModal && (
        <ProfileModal
          profile={profile}
          token={token}
          userEmail={session?.user?.email}
          onSave={(p) => setProfile(p)}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Toast notification — shown briefly after actions like save, delete, send */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          // Green background for success messages, red for errors
          background: toast.type === "success" ? "var(--paid)" : "var(--voided)",
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
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
