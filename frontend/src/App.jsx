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
import { downloadReceiptPDF, shareReceiptPDF, previewReceiptPDF, buildPDFBase64 } from "./components/ReceiptPDF";
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
import HelpModal from "./components/HelpModal";
import LegalModal from "./components/LegalModal";
import BillingModal from "./components/BillingModal";
import { supabase } from "./lib/supabase";
import { fetchProfile } from "./api/profile";
import { startCheckout } from "./api/billing";
import { applyPalette, clearPalette, PALETTE_ENTRIES, PALETTE_KEYS, readPaletteFromStorage } from "./lib/themes";
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
  { key: "ALL",    label: "All" },
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
  voided: "Invoice voided",
};

function fmt(n) {
  return "$" + parseFloat(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function App() {

  // Live clock — updates every second for the topbar time display.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /*
    darkMode — true when the user has switched to dark mode.
    We read the saved preference from localStorage on first load so it
    persists between sessions. The value is stored as the string "1".
  */
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("dark_mode") === "1";
  });

  // Apply dark mode by toggling a data attribute on <html>.
  // CSS variables in App.css are scoped to [data-theme="dark"].
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("dark_mode", "1");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("dark_mode", "0");
    }
  }, [darkMode]);

  /*
    Palette state — one key per mode, persisted in localStorage.
    null = "default" (uses App.css :root / [data-theme="dark"] values).
    Only keys from PALETTE_KEYS are accepted; anything else is silently ignored.
  */
  const [lightPalette, setLightPaletteState] = useState(() => readPaletteFromStorage("theme_light_palette"));
  const [darkPalette,  setDarkPaletteState]  = useState(() => readPaletteFromStorage("theme_dark_palette"));

  const currentPalette = darkMode ? darkPalette : lightPalette;

  function setPalette(key) {
    // applyPalette() validates the key — only normalize null here and persist.
    const safe = key && PALETTE_KEYS.has(key) ? key : null;
    if (darkMode) {
      setDarkPaletteState(safe);
      if (safe) localStorage.setItem("theme_dark_palette", safe);
      else localStorage.removeItem("theme_dark_palette");
    } else {
      setLightPaletteState(safe);
      if (safe) localStorage.setItem("theme_light_palette", safe);
      else localStorage.removeItem("theme_light_palette");
    }
  }

  const [session, setSession]                   = useState(null);
  const [authLoading, setAuthLoading]           = useState(true);
  const [profileLoading, setProfileLoading]     = useState(true);
  const [showAuthModal, setShowAuthModal]       = useState(false);
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const proIntentRef = useRef("");

  /*
    "entered" persists in localStorage so a page refresh skips the landing screen.
  */
  const [entered, setEntered] = useState(() => !!localStorage.getItem("app_entered"));

  /*
    Apply or clear palette whenever mode, palette choice, or entered state changes.
    Must be declared AFTER entered — the dependency array is evaluated immediately
    and reading entered before its useState line is a TDZ crash in the minified build.
    Landing page (entered === false) always gets cleared so the user's theme never
    bleeds through to the public-facing screen.
  */
  useEffect(() => {
    if (!entered) {
      clearPalette();
      return;
    }
    applyPalette(currentPalette, darkMode ? "dark" : "light");
  }, [entered, currentPalette, darkMode]);

  const [swipedId, setSwipedId]       = useState(null);
  const touchStartX                   = useRef(0);
  const [receipts, setReceipts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState("ALL");

  /*
    selected: the full receipt object shown in the detail panel, fetched by ID
    (includes line_items). Null hides the panel.
  */
  const [selected, setSelected]           = useState(null);
  const [profile, setProfile]             = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showHelp, setShowHelp]           = useState(false);
  const [showBilling, setShowBilling]     = useState(false);
  const [paletteExpanded, setPaletteExpanded] = useState(false);
  const [showForm, setShowForm]           = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [legal, setLegal]                 = useState(null);
  // Pre-checkout consent modal — shown before redirecting to Stripe
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [upgradeAgreed, setUpgradeAgreed]           = useState(false);
  const [upgradeLegal, setUpgradeLegal]             = useState(null);
  /*
    upgradeTargetTier — which tier the upgrade confirm modal is targeting.
    "pro"   → shown when a free user clicks Upgrade to Pro
    "voice" → shown when a pro user clicks Upgrade to Voice AI
    Drives the modal title, price copy, and the tier passed to startCheckout().
  */
  const [upgradeTargetTier, setUpgradeTargetTier]   = useState("pro");

  // Single entry point for opening the upgrade modal — always sets tier and resets checkbox.
  function openUpgradeConfirm(tier) {
    setUpgradeTargetTier(tier);
    setUpgradeAgreed(false);
    setShowUpgradeConfirm(true);
  }

  // Toast: { msg, type: "success" | "error" }. Auto-clears after 3.5s.
  const [toast, setToast] = useState(null);

  // Lock body scroll on iOS when any modal is open.
  // iOS Safari ignores position:fixed for preventing background scroll.
  useEffect(() => {
    const anyOpen = showForm || showProfileModal || showHelp || showBilling || !!legal || !!upgradeLegal || showUpgradeConfirm;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showForm, showProfileModal, showHelp, showBilling, legal, upgradeLegal, showUpgradeConfirm]);

  /*
    sendInvoiceTarget: receipt currently being emailed to a client.
    When set, the "Send to Client" button is replaced by an email input row.
  */
  const [sendInvoiceTarget, setSendInvoiceTarget]         = useState(null);
  const [sendInvoiceEmail, setSendInvoiceEmail]           = useState("");
  const [sendingInvoice, setSendingInvoice]               = useState(false);
  const [sendInvoiceConfirming, setSendInvoiceConfirming] = useState(false);

  /*
    showToast(msg, type) — show a small banner at the bottom of the screen for 3.5s.
    type is "success" (green) or "error" (red). Defaults to "error".
    Example: showToast("Receipt created.", "success")
  */
  function showToast(msg, type = "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  /*
    Auth — runs once on mount via onAuthStateChange.
    getSession() seeds state immediately on load so the app doesn't flash
    the landing page while waiting for the subscription to fire on mobile.
  */
  useEffect(() => {
    // Immediately check for an existing valid session — critical for mobile
    // where the subscription event can be delayed or fire out of order.
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (existing) {
        setSession(existing);
        setEntered(true);
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setShowPasswordUpdate(true);
        setSession(newSession);
        setAuthLoading(false);
        return;
      }

      // INITIAL_SESSION can carry an expired access_token before the refresh fires.
      // If the token is already expired, skip it and wait for TOKEN_REFRESHED.
      if (event === "INITIAL_SESSION" && newSession) {
        try {
          const { exp } = JSON.parse(atob(newSession.access_token.split(".")[1]));
          if (exp * 1000 < Date.now()) return; // expired — TOKEN_REFRESHED will follow
        } catch { /* malformed token, fall through */ }
      }

      if (!newSession) {
        setSession(null);
        // Only clear entered state on an intentional sign-out.
        // Network errors or failed token refreshes should show the auth
        // modal, not boot the user back to the landing page.
        if (event === "SIGNED_OUT") {
          localStorage.removeItem("app_entered");
          setEntered(false);
        }
        setShowAuthModal(false);
      } else {
        setSession(newSession);
        setShowAuthModal(false);
        setEntered(true);
        if (proIntentRef.current) {
          startCheckout(proIntentRef.current).catch(() => {});
          proIntentRef.current = "";
        }
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load receipts and profile whenever session changes (login, token refresh, sign-out).
  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetchReceipts()
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

    fetchProfile().then((p) => {
      setProfile(p || null);
      setProfileLoading(false);
      // First-login detection: if the profile has no business_name, the user just
      // registered and hasn't set up their account yet. Open the profile modal
      // automatically so they can enter their business details before creating invoices.
      if (!p?.business_name) {
        setShowProfileModal(true);
      }
    });
  }, [session]);

  // After returning from Stripe checkout (?upgraded=true), poll for the profile
  // until tier is paid (webhook may take a moment to fire) then clean the URL.
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("upgraded")) return;

    window.history.replaceState({}, "", window.location.pathname);

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const p = await fetchProfile();
      if (p?.tier === "pro" || p?.tier === "voice") {
        setProfile(p);
        clearInterval(interval);
      } else if (attempts >= 10) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [session]);

  /*
    Badge counts per status — recalculated only when the receipts array changes.
    useMemo prevents this loop from running on every render (e.g. when a modal opens).
    Result shape: { draft: 2, sent: 1, paid: 5, voided: 0 }
  */
  const counts = useMemo(() => {
    const result = {};
    for (const status of Object.keys(STATUS_CONFIG)) {
      result[status] = receipts.filter((r) => r.status === status).length;
    }
    return result;
  }, [receipts]);

  // Revenue: sum of paid receipts using subtotal (pre-tax).
  const revenue = receipts
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + parseFloat(r.subtotal || 0), 0);

  // Outstanding: sum of sent receipts including tax.
  const outstanding = receipts
    .filter((r) => r.status === "sent")
    .reduce((sum, r) => sum + parseFloat(r.total || 0), 0);

  // Compact number for sidebar stats — avoids overflow in narrow columns
  function fmtStat(n) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000)    return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  }

  const filtered = useMemo(() => {
    if (filter === "ALL") return receipts;
    return receipts.filter((r) => r.status === filter);
  }, [receipts, filter]);

  /*
    Fetch a receipt by ID (includes line_items) and open the detail panel.
    The list view only carries summary data, so we need a separate fetch for the full object.
  */
  async function selectFull(id) {
    const full = await fetchReceiptById(id);
    // Guard against error responses (e.g. 404) — don't corrupt selected state
    if (full?.error) return;
    setSelected(full);
  }

  /*
    Called when the receipt form is submitted.
    data.id present = editing existing; absent = creating new.
    The list is updated in-place — no full reload needed.
  */
  async function handleSaveReceipt(data) {
    try {
      if (data.id) {
        const result = await updateReceipt(data.id, data);
        if (result?.error) throw new Error(result.error);
        const updated = { ...result, line_items: data.line_items ?? [] };
        setReceipts((prev) => prev.map((r) => (r.id === data.id ? updated : r)));
        setSelected(updated);
        showToast("Invoice updated.", "success");
      } else {
        const result = await createReceipt(data);
        if (result?.error) throw new Error(result.error);
        setReceipts((prev) => [result, ...prev]);
        showToast("Invoice created.", "success");
      }
      setShowForm(false);
      setEditingReceipt(null);
    } catch (err) {
      showToast(err.message || "Failed to save. Check all fields.");
    }
  }

  /*
    Update a receipt's status optimistically — we update the local list immediately
    so the UI feels instant, without waiting for the server to confirm.
    If the server call fails silently the user will see the wrong status until
    they refresh, but that's an acceptable tradeoff vs showing a loading state
    on every status tap.
  */
  async function handleStatusChange(id, status) {
    await updateReceipt(id, { status });
    setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (selected && selected.id === id) setSelected((s) => ({ ...s, status }));
    showToast(STATUS_LABELS[status] || "Status updated", "success");
  }

  /*
    Ask for confirmation before deleting — shows the receipt number so the user
    knows exactly what they're about to lose. This cannot be undone.
  */
  async function handleDelete(id) {
    const rec = receipts.find((r) => r.id === id);
    if (!window.confirm(`Delete invoice ${rec?.receipt_number ?? id}?`)) return;
    await deleteReceipt(id);
    setReceipts((prev) => prev.filter((r) => r.id !== id));
    if (selected && selected.id === id) setSelected(null);
  }

  /*
    handleSendInvoice() — email the selected receipt to the client.
    Calls the send-invoice Supabase Edge Function which uses Resend.
    Requires RESEND_API_KEY set in Supabase Edge Function secrets.
  */
  async function handleSendInvoice() {
    if (!sendInvoiceEmail) return;
    setSendInvoiceConfirming(false);
    setSendingInvoice(true);
    try {
      const r = sendInvoiceTarget;

      // Generate the PDF in the browser and convert to base64 for the email attachment
      const pdfBase64 = await buildPDFBase64({
        ...r,
        logo_url: r.logo_url || profile?.logo_url || null,
        logo_corner: r.logo_corner || null,
        tier: profile?.tier ?? "free",
      });

      const { data: { session: _s } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${_s?.access_token ?? ""}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          to: sendInvoiceEmail,
          vendor_name: r.vendor_name,
          vendor_email: profile?.email || "",
          vendor_address: profile?.address || "",
          customer_name: r.customer_name,
          receipt_number: r.receipt_number,
          date: r.date,
          line_items: r.line_items,
          subtotal: r.subtotal,
          tax: r.tax,
          total: r.total,
          currency: r.currency || "CAD",
          notes: r.notes,
          payment_url: profile?.payment_url,
          tier: profile?.tier ?? "free",
          logo_url: r.logo_url || profile?.logo_url || null,
          logo_corner: r.logo_corner || null,
          pdf_base64: pdfBase64,
          is_reminder: !!r._isReminder,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? "Send failed"); }

      // Auto-advance draft invoices to "sent" — paid/voided stay unchanged
      if (r.status === "draft") {
        await updateReceipt(r.id, { status: "sent" });
        setReceipts((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "sent" } : x)));
        if (selected?.id === r.id) setSelected((s) => ({ ...s, status: "sent" }));
      }

      showToast(`Invoice sent to ${sendInvoiceEmail}.`, "success");
      setSendInvoiceTarget(null);
      setSendInvoiceEmail("");
    } catch (err) {
      const errorMessage = err.message || "Failed to send invoice.";
      showToast(errorMessage);
    }
    setSendingInvoice(false);
  }

  function openNewReceipt() {
    setEditingReceipt(null);
    setShowForm(true);
  }
  async function openEditReceipt(receipt) {
    // If the receipt doesn't have line_items yet (e.g. came from the list),
    // do a fresh fetch so the edit form has full data to pre-populate.
    if (!receipt.line_items) {
      const full = await fetchReceiptById(receipt.id);
      setEditingReceipt(full?.error ? receipt : full);
    } else {
      setEditingReceipt(receipt);
    }
    setShowForm(true);
  }

  /*
    Merge `selected` (full object with line_items) with the live status from the list.
    Status buttons update `receipts` optimistically, but `selected` holds a snapshot
    from when we fetched it — merging gives us the latest status without re-fetching.
  */
  let selectedReceipt = null;
  if (selected) {
    const live = receipts.find((r) => r.id === selected.id);
    selectedReceipt = { ...selected, status: live ? live.status : selected.status };
  }

  if (authLoading) return null;

  // Show landing whenever not entered OR entered but no session yet.
  // This ensures the AuthModal always has a back button (onBack resets to landing).
  if (!entered || !session) {
    return (
      <>
        <LandingPage
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(!darkMode)}
          onSignIn={() => setShowAuthModal(true)}
          onEnter={() => {
            localStorage.setItem("app_entered", "1");
            setEntered(true);
            if (!session) setShowAuthModal(true);
          }}
          onEnterPro={() => {
            proIntentRef.current = "pro";
            localStorage.setItem("app_entered", "1");
            setEntered(true);
            if (session) {
              startCheckout("pro").catch(() =>
                showToast("Couldn't open checkout. Try again.")
              );
            } else {
              setShowAuthModal(true);
            }
          }}
          onEnterVoice={() => {
            // Store intent so checkout fires immediately after sign-up if not yet signed in.
            proIntentRef.current = "voice";
            localStorage.setItem("app_entered", "1");
            setEntered(true);
            if (session) {
              startCheckout("voice").catch(() =>
                showToast("Couldn't open checkout. Try again.")
              );
            } else {
              setShowAuthModal(true);
            }
          }}
        />
        {showAuthModal && (
          <AuthModal
            onBack={() => {
              setShowAuthModal(false);
              localStorage.removeItem("app_entered");
              setEntered(false);
            }}
            onClose={() => setShowAuthModal(false)}
          />
        )}
      </>
    );
  }

  const userEmail = session?.user?.email ?? "";
  const avatarUrl = profile?.avatar_url || profile?.logo_url || null;

  /*
    Time-based greeting. Name priority: business_name > email username > nothing.
  */
  const hour = now.getHours();
  const salutation = hour >= 5 && hour < 12 ? "Good morning"
                   : hour >= 12 && hour < 17 ? "Good afternoon"
                   : "Good evening";
  const greetingName = profile?.business_name || userEmail.split("@")[0] || "";
  const greeting = greetingName ? `${salutation}, ${greetingName}` : salutation;

  return (
    <div className="app-shell">

      {/* Top bar: 3 columns — dark toggle far left | date centered | avatar far right */}
      <header className="topbar">

        {/* Column 1 — far left: mode toggle + palette picker */}
        <div className="topbar-left">
          <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "Light" : "Dark"}
          </button>

          {/* Palette picker — collapsed to one circle by default, expands on click */}
          <div className="palette-picker" role="group" aria-label="Color palette">

            {/* Trigger swatch — shows current selection; click to expand */}
            {(() => {
              const activeMeta = currentPalette ? PALETTE_ENTRIES.find(([k]) => k === currentPalette)?.[1] : null;
              const trigBg     = activeMeta ? (darkMode ? activeMeta.darkBg     : activeMeta.lightBg)     : null;
              const trigAccent = activeMeta ? (darkMode ? activeMeta.darkAccent : activeMeta.lightAccent) : null;
              return (
                <button
                  className={`palette-swatch palette-trigger${!activeMeta ? " palette-swatch-default" : ""}${paletteExpanded ? " palette-trigger-hidden" : ""}`}
                  style={activeMeta ? { background: `linear-gradient(135deg, ${trigBg} 50%, ${trigAccent} 50%)` } : undefined}
                  onClick={() => setPaletteExpanded(true)}
                  title="Choose color"
                  aria-label="Open color picker"
                  aria-expanded={paletteExpanded}
                />
              );
            })()}

            {/* Expanded strip — slides in horizontally */}
            <div className={`palette-swatches${paletteExpanded ? " open" : ""}`}>
              {/* Default / reset swatch inside expanded strip */}
              <button
                className={`palette-swatch palette-swatch-default${!currentPalette ? " palette-swatch-active" : ""}`}
                onClick={() => { setPalette(null); setPaletteExpanded(false); }}
                title="Default"
                aria-pressed={!currentPalette}
                aria-label="Default palette"
              />
              {PALETTE_ENTRIES.map(([key, meta]) => {
                const bg     = darkMode ? meta.darkBg     : meta.lightBg;
                const accent = darkMode ? meta.darkAccent : meta.lightAccent;
                return (
                  <button
                    key={key}
                    className={`palette-swatch${currentPalette === key ? " palette-swatch-active" : ""}`}
                    style={{ background: `linear-gradient(135deg, ${bg} 50%, ${accent} 50%)` }}
                    onClick={() => { setPalette(key); setPaletteExpanded(false); }}
                    title={meta.label}
                    aria-pressed={currentPalette === key}
                    aria-label={`${meta.label} palette`}
                  />
                );
              })}
              {/* Collapse button */}
              <button
                className="palette-close-btn"
                onClick={() => setPaletteExpanded(false)}
                title="Close"
                aria-label="Close color picker"
              >✕</button>
            </div>
          </div>
        </div>

        {/* Column 2 — center */}
        <div className="topbar-meta">
          <span className="topbar-time">
            {now.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: true })}
          </span>
          <span className="topbar-date-sep"> · </span>
          <span className="topbar-date-full">{now.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}</span>
          <span className="topbar-date-short">{now.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}</span>
        </div>

        {/* Column 3 — far right */}
        <div className="topbar-right">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="avatar-btn"
                aria-label="User menu"
                style={(profile?.tier === "pro" || profile?.tier === "voice") ? { border: "2px solid #D4AF37", boxShadow: "0 0 0 1px rgba(212,175,55,0.25)" } : undefined}
              >
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
        </div>
      </header>

      {/* Sidebar — stats, filter nav, and the + New Receipt button */}
      <aside className="sidebar">

        {/* Stats block: revenue (paid, pre-tax), outstanding (sent, inc. tax), total count */}
        <div className="sidebar-section">
          <div className="stat-block">
            <div className="stat-label">Revenue</div>
            <div className="stat-value">{fmtStat(revenue)}</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Outstanding</div>
            <div className="stat-value">{fmtStat(outstanding)}</div>
            <div className="stat-sub">inc. tax</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Invoices</div>
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
          <>
            <button
              className="btn btn-ghost"
              style={{ width: "100%", fontSize: 12, letterSpacing: "0.06em" }}
              onClick={() => setShowProfileModal(true)}
            >
              {profile?.business_name ? `✎ ${profile.business_name}` : "+ Add Business Profile"}
            </button>
            {!profileLoading && (profile?.tier === "free" || !profile?.tier) && (
              <button
                className="btn btn-primary"
                style={{ width: "100%", fontSize: 12 }}
                onClick={() => openUpgradeConfirm("pro")}
              >
                Upgrade to Pro
              </button>
            )}
            {!profileLoading && profile?.tier === "pro" && (
              <button
                className="btn btn-primary"
                style={{ width: "100%", fontSize: 12, background: "var(--accent)", borderColor: "var(--accent)" }}
                onClick={() => openUpgradeConfirm("voice")}
              >
                Upgrade to Voice AI
              </button>
            )}
          </>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={openNewReceipt}>
            + New Invoice
          </button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 4, position: "relative" }}>
            {!profileLoading && (profile?.tier === "free" || !profile?.tier) && (
              <>
                <button onClick={() => setLegal("terms")} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}>Terms</button>
                <button onClick={() => setLegal("privacy")} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}>Privacy</button>
              </>
            )}
            <button onClick={() => setShowBilling(true)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}>Billing</button>
            <button className="help-btn" onClick={() => setShowHelp(true)} aria-label="Help" style={{ position: "absolute", right: 0 }}>?</button>
          </div>
        </div>
      </aside>

      {/* Main content area: toolbar greeting + receipt grid + optional detail panel */}
      <main className="main">

        {/* Toolbar: greeting on the left, receipt count on the right */}
        <div className="toolbar">
          <span className="toolbar-greeting">{greeting}</span>
          <span className="toolbar-title">
            {filter === "ALL" ? "All" : STATUS_CONFIG[filter]?.label}: {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="content-area">

          {/* Receipt grid — each card shows client name, receipt number, status, total */}
          <div className="receipt-grid-wrap">
            {loading ? (
              <div className="empty">Loading...</div>
            ) : filtered.length === 0 ? (
              /*
                Rendered outside the grid intentionally — the grid uses auto-fill columns
                so anything inside it only spans one cell and ends up left-aligned.
                Putting the empty state here lets it stretch the full container width.
              */
              <div className="empty" style={{ textAlign: "center", width: "100%" }}>No invoices found</div>
            ) : (
              <div className="receipt-grid">
                {filtered.map((r) => (
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
                          <span className="card-total">{fmt(r.total)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Detail panel — shown when a receipt card is tapped/clicked */}
          {selectedReceipt && (
            <div className="detail-panel">

              {/* Top bar: edit/delete actions + close */}
              <div className="detail-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ border: "1px solid var(--border)" }}
                      onClick={() => openEditReceipt(selectedReceipt)}
                    >
                      ✎ Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: "0 12px" }}
                      onClick={() => handleDelete(selectedReceipt.id)}
                    >
                      ✕ Delete
                    </button>
                  </div>
                  <button onClick={() => setSelected(null)} className="btn-icon close-btn">✕</button>
                </div>
              </div>

              {/* Invoice document preview */}
              <div style={{ padding: "12px 14px 4px" }}>
                <div className="inv-doc">

                  {/* Dark header bar: INVOICE label + invoice number */}
                  <div className="inv-doc-head">
                    <span className="inv-doc-title">INVOICE</span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", marginBottom: 2 }}>NO.</div>
                      <div style={{ fontSize: 11, color: "#fff", fontFamily: "var(--mono)", fontWeight: 600, letterSpacing: "0.06em" }}>
                        {selectedReceipt.receipt_number}
                      </div>
                    </div>
                  </div>

                  {/* Parties: FROM / BILLED TO / DATE + STATUS */}
                  <div className="inv-doc-parties">
                    <div className="inv-doc-party">
                      <div className="inv-party-label">FROM</div>
                      <div className="inv-party-name">{selectedReceipt.vendor_name}</div>
                    </div>
                    <div className="inv-doc-party">
                      <div className="inv-party-label">BILLED TO</div>
                      <div className="inv-party-name">{selectedReceipt.customer_name}</div>
                    </div>
                    <div className="inv-doc-party" style={{ textAlign: "right" }}>
                      <div className="inv-party-label">DATE</div>
                      <div className="inv-party-name" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                        {selectedReceipt.date
                          ? new Date(selectedReceipt.date).toLocaleDateString("en-CA")
                          : "—"}
                      </div>
                      <span className={`stamp ${selectedReceipt.status}`} style={{ marginTop: 6 }}>
                        {selectedReceipt.status}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: "var(--border)", margin: "0 14px" }} />

                  {/* Line items table */}
                  <div style={{ padding: "10px 14px 0" }}>
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
                              <td className="number">{fmt(li.unit_price)}</td>
                              <td className="number">{fmt(li.total)}</td>
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
                  </div>

                  {/* Totals block */}
                  <div style={{ padding: "8px 14px 14px", borderTop: "1px solid var(--border-light)", marginTop: 4 }}>
                    {parseFloat(selectedReceipt.subtotal || 0) > 0 && (
                      <div className="total-line">
                        <span className="tl-label">Subtotal</span>
                        <span className="tl-val">{fmt(selectedReceipt.subtotal)}</span>
                      </div>
                    )}
                    {parseFloat(selectedReceipt.tax || 0) > 0 && (
                      <div className="total-line">
                        <span className="tl-label">Tax</span>
                        <span className="tl-val">{fmt(selectedReceipt.tax)}</span>
                      </div>
                    )}
                    <div className="total-line grand">
                      <span className="tl-label">Total</span>
                      <span className="tl-val">{fmt(selectedReceipt.total)}</span>
                    </div>
                  </div>

                  {/* Notes — only shown if the receipt has notes */}
                  {selectedReceipt.notes && (
                    <div style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--border-light)" }}>
                      <div style={{ fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 5 }}>Notes</div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.55 }}>{selectedReceipt.notes}</div>
                    </div>
                  )}
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
                    Scan to pay · {fmt(selectedReceipt.total)}
                  </div>
                </div>
              )}

              {/* PDF actions */}
              <div className="detail-section">
                {"share" in navigator && (
                  <button
                    className="btn btn-ghost"
                    style={{ width: "100%", marginBottom: 6 }}
                    onClick={() => (profile?.tier === "pro" || profile?.tier === "voice")
                      ? shareReceiptPDF({ ...selectedReceipt, logo_url: selectedReceipt.logo_url || profile?.logo_url, tier: profile?.tier })
                      : showToast("Upgrade to Pro to share invoices.", "upgrade")
                    }
                  >
                    Share Invoice {!profileLoading && (profile?.tier === "free" || !profile?.tier) && <span style={{ fontSize: 9, letterSpacing: "0.1em", opacity: 0.5, marginLeft: 4 }}>PRO</span>}
                  </button>
                )}
                <button
                  className="btn btn-ghost"
                  style={{ width: "100%", marginBottom: 6 }}
                  onClick={() => previewReceiptPDF({ ...selectedReceipt, logo_url: selectedReceipt.logo_url || profile?.logo_url, tier: profile?.tier })}
                >
                  Preview PDF
                </button>
                <button
                  className="btn btn-download"
                  style={{ width: "100%", marginBottom: 6 }}
                  onClick={() => downloadReceiptPDF({ ...selectedReceipt, logo_url: selectedReceipt.logo_url || profile?.logo_url, tier: profile?.tier })}
                >
                  Download PDF
                </button>

                {/* Send Payment Reminder — Pro/Voice only, sent invoices only */}
                {(profile?.tier === "pro" || profile?.tier === "voice") && selectedReceipt.status === "sent" && (
                  <div style={{ marginTop: 6 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ width: "100%" }}
                      onClick={() => {
                        setSendInvoiceTarget({ ...selectedReceipt, _isReminder: true });
                        setSendInvoiceEmail(selectedReceipt.customer_email || "");
                      }}
                    >
                      &#8635; Send Reminder
                    </button>
                  </div>
                )}

                {/* Send to Client — pro feature */}
                <div style={{ marginTop: 6, borderTop: "1px solid var(--border-light)", paddingTop: 10 }}>
                  {sendInvoiceTarget?.id === selectedReceipt.id ? (
                    <div>
                      {sendInvoiceConfirming ? (
                        // Confirmation step
                        <div>
                          <p style={{ fontSize: 12, color: "var(--text)", marginBottom: 10, lineHeight: 1.5 }}>
                            Send invoice to <strong>{sendInvoiceEmail}</strong>? Are you ready to send?
                          </p>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setSendInvoiceConfirming(false)}>Go Back</button>
                            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSendInvoice} disabled={sendingInvoice}>
                              {sendingInvoice ? "Sending..." : "Yes, Send"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Email input step
                        <div>
                          <input
                            className="field"
                            type="email"
                            placeholder="Client email address"
                            autoFocus
                            value={sendInvoiceEmail}
                            onChange={(e) => setSendInvoiceEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendInvoiceEmail && setSendInvoiceConfirming(true)}
                            style={{ marginBottom: 6 }}
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setSendInvoiceTarget(null); setSendInvoiceEmail(""); setSendInvoiceConfirming(false); }}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => sendInvoiceEmail && setSendInvoiceConfirming(true)} disabled={!sendInvoiceEmail}>
                              Send Invoice
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      style={{ width: "100%" }}
                      onClick={() => { setSendInvoiceTarget(selectedReceipt); setSendInvoiceEmail(""); }}
                    >
                      ✉ Send to Client
                    </button>
                  )}
                </div>
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
          userEmail={userEmail}
          onLogoUpdate={(url) => setProfile((p) => ({ ...p, logo_url: url }))}
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

      {/* Help modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} isPro={profile?.tier === "pro" || profile?.tier === "voice"} onLegal={setLegal} />}

      {/* Legal modals */}
      {legal && <LegalModal type={legal} onClose={() => setLegal(null)} />}

      {/* Billing modal */}
      {showBilling && <BillingModal profile={profile} onClose={() => setShowBilling(false)} />}

      {/* Pre-checkout consent modal — shown before redirecting to Stripe.
          User must explicitly agree to recurring billing terms before checkout. */}
      {showUpgradeConfirm && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowUpgradeConfirm(false)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <span className="modal-title">Upgrade to {upgradeTargetTier === "voice" ? "Voice AI" : "Pro"}</span>
              <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={() => setShowUpgradeConfirm(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                {upgradeTargetTier === "voice" ? "Voice AI: CAD $12.00 / month" : "Pro: CAD $9.00 / month"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6 }}>
                You will be charged CAD {upgradeTargetTier === "voice" ? "$12.00" : "$9.00"} each month. Your subscription renews automatically until cancelled. Cancellation takes effect at the end of the current billing period. No partial refunds.
              </div>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  checked={upgradeAgreed}
                  onChange={(e) => setUpgradeAgreed(e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <span>
                  I understand this is a recurring monthly subscription and I agree to the{" "}
                  <button type="button" onClick={() => setUpgradeLegal("terms")} style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Terms of Service</button>
                  {" "}and{" "}
                  <button type="button" onClick={() => setUpgradeLegal("privacy")} style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>Privacy Policy</button>.
                </span>
              </label>
              {!upgradeAgreed && (
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>You must check the box above to continue.</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowUpgradeConfirm(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!upgradeAgreed}
                onClick={() => { setShowUpgradeConfirm(false); startCheckout(upgradeTargetTier).catch(() => showToast("Couldn't open checkout. Try again.")); }}
              >
                Continue to Payment →
              </button>
            </div>
          </div>
        </div>
      )}
      {upgradeLegal && <LegalModal type={upgradeLegal} onClose={() => setUpgradeLegal(null)} />}

      {/* Profile / settings modal */}
      {showProfileModal && (
        <ProfileModal
          profile={profile}
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
          // Green for success, warm copper for upgrade prompts, red for errors
          background: toast.type === "success" ? "var(--paid)" : toast.type === "upgrade" ? "var(--accent)" : "var(--voided)",
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
          cursor: toast.type === "upgrade" ? "pointer" : "default",
        }}
        onClick={toast.type === "upgrade" ? () => openUpgradeConfirm("pro") : undefined}
        >
          {toast.msg}{toast.type === "upgrade" ? " →" : ""}
        </div>
      )}
    </div>
  );
}
