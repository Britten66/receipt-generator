/*
  App.jsx — main app shell for InvoicePrepper.

  SECTIONS IN THIS FILE (Ctrl+F the section name to jump):
    1. IMPORTS
    2. CONSTANTS           — STATUS_CONFIG, NAV, STATUS_LABELS, fmt helpers
    3. STATE               — every useState / useRef declared in one place
    4. EFFECTS             — dark mode, palette, auth, data loading, post-checkout poll
    5. HANDLERS            — save, delete, status change, send invoice, open/close helpers
    6. DERIVED VALUES      — counts, revenue, outstanding, filtered list, selectedReceipt merge
    7. EARLY RETURNS       — auth loading spinner, landing / auth gate
    8. RENDER              — topbar, sidebar, main content, detail panel
    9. MODALS              — all modal JSX at the bottom; each is a separate component file

  Layout (desktop):
    topbar (full width)
    sidebar | receipt grid | detail panel (when a receipt is selected)

  Layout (mobile):
    topbar
    sidebar becomes a stats + filter strip at the top
    receipt grid scrolls below
    detail panel takes over full screen when a receipt is tapped
*/

// ─── 1. IMPORTS ──────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect, useRef } from "react";
// ReceiptPDF is loaded on demand — jsPDF + html2canvas are ~360 KB and only needed when generating a PDF
import {
  fetchReceipts,
  fetchReceiptById,
  createReceipt,
  updateReceipt,
  deleteReceipt,
} from "./api/receipts";
import ReceiptForm         from "./components/ReceiptForm";
import LandingPage         from "./components/LandingPage";
import AuthModal           from "./components/AuthModal";
import ProfileModal        from "./components/ProfileModal";
import PasswordUpdateModal from "./components/PasswordUpdateModal";
import HelpModal           from "./components/HelpModal";
import LegalModal          from "./components/LegalModal";
import BillingModal        from "./components/BillingModal";
import PlansModal          from "./components/PlansModal";
import UpgradeConfirmModal from "./components/UpgradeConfirmModal";
import WelcomeModal        from "./components/WelcomeModal";
import UpgradeThanksModal  from "./components/UpgradeThanksModal";
import { supabase }        from "./lib/supabase";
import { fetchProfile }    from "./api/profile";
import { startCheckout }   from "./api/billing";
import { applyPalette, clearPalette, PALETTE_ENTRIES, PALETTE_KEYS, readPaletteFromStorage } from "./lib/themes";
import { QRCodeSVG }       from "qrcode.react";
import * as DropdownMenu   from "@radix-ui/react-dropdown-menu";
import "./App.css";

// ─── 2. CONSTANTS ────────────────────────────────────────────────────────────

/*
  STATUS_CONFIG — the four states a receipt can be in.
  Used to build the sidebar nav and the status-change buttons in the detail panel.

    draft  → saved, not sent yet
    sent   → delivered to client, awaiting payment
    paid   → client paid, counts toward revenue
    voided → cancelled, excluded from all stats
*/
const STATUS_CONFIG = {
  draft:  { label: "Draft" },
  sent:   { label: "Sent" },
  paid:   { label: "Paid" },
  voided: { label: "Voided" },
};

/*
  NAV — filter list shown in the sidebar.
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
  STATUS_LABELS — toast copy shown after changing a receipt's status.
  Example: marking a receipt as paid → "Marked as paid"
*/
const STATUS_LABELS = {
  draft:  "Saved as draft",
  sent:   "Marked as sent",
  paid:   "Marked as paid",
  voided: "Invoice voided",
};

// fmt: "$1,234.56" — used on cards and in the detail panel totals block
function fmt(n) {
  return "$" + parseFloat(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── 3. APP COMPONENT ────────────────────────────────────────────────────────

export default function App() {

  // ─── STATE ─────────────────────────────────────────────────────────────────

  // Theme
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("dark_mode") === "1");
  const [lightPalette, setLightPaletteState] = useState(() => readPaletteFromStorage("theme_light_palette"));
  const [darkPalette,  setDarkPaletteState]  = useState(() => readPaletteFromStorage("theme_dark_palette"));
  const [paletteExpanded, setPaletteExpanded] = useState(false);
  const currentPalette = darkMode ? darkPalette : lightPalette;

  // Auth
  const [session, setSession]           = useState(null);
  const [authLoading, setAuthLoading]   = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("signup"); // "signup" | "login"
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const proIntentRef = useRef(""); // stores "pro" | "voice" when user clicks upgrade before signing in

  // App entry
  // "entered" persists in localStorage so a page refresh skips the landing screen
  const [entered, setEntered] = useState(() => !!localStorage.getItem("app_entered"));

  // Preferred currency — persists in localStorage, syncs to profile on login
  const [preferredCurrency, setPreferredCurrency] = useState(
    () => localStorage.getItem("preferred_currency") || "CAD"
  );
  function handleCurrencyChange(val) {
    setPreferredCurrency(val);
    localStorage.setItem("preferred_currency", val);
  }

  // Data
  const [receipts, setReceipts]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState("ALL");
  const [profile, setProfile]             = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Detail panel
  // selected: full receipt object (includes line_items). Null = panel hidden.
  const [selected, setSelected] = useState(null);

  // Send invoice flow (email to client)
  const [sendInvoiceTarget, setSendInvoiceTarget]         = useState(null);
  const [sendInvoiceEmail, setSendInvoiceEmail]           = useState("");
  const [sendingInvoice, setSendingInvoice]               = useState(false);
  const [sendInvoiceConfirming, setSendInvoiceConfirming] = useState(false);

  // Mobile swipe-to-delete
  const [swipedId, setSwipedId] = useState(null);
  const touchStartX             = useRef(0);

  // Form
  const [showForm, setShowForm]             = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showHelp, setShowHelp]                 = useState(false);
  const [showBilling, setShowBilling]           = useState(false);
  const [showPlansModal, setShowPlansModal]     = useState(false);
  const [showWelcome, setShowWelcome]           = useState(false);       // new-user one-time modal
  const [showUpgradeThanks, setShowUpgradeThanks] = useState(false);    // post-checkout one-time modal
  const [legal, setLegal]                       = useState(null);        // "terms" | "privacy" | null
  const [upgradeLegal, setUpgradeLegal]         = useState(null);        // legal inside upgrade confirm

  // Upgrade confirm modal (pre-Stripe consent gate)
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [upgradeAgreed, setUpgradeAgreed]           = useState(false);
  const [upgradeTargetTier, setUpgradeTargetTier]   = useState("pro");   // "pro" | "voice"

  // In-app PDF preview overlay (Android mobile only — iOS uses Quick Look, desktop uses popup)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  // Toast: { msg, type: "success" | "error" | "upgrade" }. Auto-clears after 3.5s.
  const [toast, setToast] = useState(null);

  // ─── EFFECTS ───────────────────────────────────────────────────────────────

  // Apply dark mode via data-theme attribute on <html>. CSS vars in App.css are scoped to [data-theme="dark"].
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("dark_mode", "1");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("dark_mode", "0");
    }
  }, [darkMode]);

  // Apply or clear palette. Must run AFTER the entered state declaration (TDZ safety).
  // Landing page always clears palette so the user's theme never bleeds through to the public screen.
  useEffect(() => {
    if (!entered) { clearPalette(); return; }
    applyPalette(currentPalette, darkMode ? "dark" : "light");
  }, [entered, currentPalette, darkMode]);

  // Lock body scroll when any modal is open.
  // iOS Safari ignores overflow:hidden on body — the fix is position:fixed + saved scroll top.
  useEffect(() => {
    const anyOpen = showForm || showProfileModal || showHelp || showBilling || !!legal || !!upgradeLegal
      || showUpgradeConfirm || showWelcome || showUpgradeThanks || showPlansModal || showAuthModal || !!pdfPreviewUrl;
    if (anyOpen) {
      const scrollY = window.scrollY;
      document.body.style.position  = "fixed";
      document.body.style.top       = `-${scrollY}px`;
      document.body.style.width     = "100%";
      document.body.style.overflow  = "hidden";
    } else {
      const scrollY = parseFloat(document.body.style.top || "0") * -1;
      document.body.style.position  = "";
      document.body.style.top       = "";
      document.body.style.width     = "";
      document.body.style.overflow  = "";
      window.scrollTo(0, scrollY);
    }
    return () => {
      document.body.style.position  = "";
      document.body.style.top       = "";
      document.body.style.width     = "";
      document.body.style.overflow  = "";
    };
  }, [showForm, showProfileModal, showHelp, showBilling, legal, upgradeLegal, showUpgradeConfirm, showWelcome, showUpgradeThanks, showPlansModal, showAuthModal, pdfPreviewUrl]);

  // Auth — runs once on mount.
  // getSession() seeds state immediately so the app doesn't flash the landing page
  // while waiting for onAuthStateChange to fire on mobile.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (existing) { setSession(existing); setEntered(true); setAuthLoading(false); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setShowPasswordUpdate(true);
        setSession(newSession);
        setAuthLoading(false);
        return;
      }

      // INITIAL_SESSION can carry an expired token before TOKEN_REFRESHED fires — skip it.
      if (event === "INITIAL_SESSION" && newSession) {
        try {
          const { exp } = JSON.parse(atob(newSession.access_token.split(".")[1]));
          if (exp * 1000 < Date.now()) return;
        } catch { /* malformed token — fall through */ }
      }

      if (!newSession) {
        setSession(null);
        // Only clear entered on an intentional sign-out.
        // Network errors or token refresh failures show the auth modal, not the landing page.
        if (event === "SIGNED_OUT") { localStorage.removeItem("app_entered"); setEntered(false); }
        setShowAuthModal(false);
      } else {
        setSession(newSession);
        setShowAuthModal(false);
        setEntered(true);

        // If the user clicked upgrade before signing in, kick off checkout now.
        if (proIntentRef.current) {
          startCheckout(proIntentRef.current, profile?.currency || preferredCurrency).catch(() => {});
          proIntentRef.current = "";
        }

        // Welcome modal: only for brand-new accounts (created within the last 2 minutes).
        // created_at check is used instead of localStorage because localStorage is unreliable in iOS PWA.
        if (event === "SIGNED_IN" && newSession?.user?.created_at) {
          const ageMs = Date.now() - new Date(newSession.user.created_at).getTime();
          if (ageMs < 2 * 60 * 1000) setShowWelcome(true);
        }
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load receipts and profile whenever the session changes (login, token refresh, sign-out).
  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetchReceipts()
      .then((data) => setReceipts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));

    fetchProfile().then((p) => {
      setProfile(p || null);
      setProfileLoading(false);
    });
  }, [session]);

  // After returning from Stripe checkout (?upgraded=true), poll until the webhook confirms
  // the tier change in the DB, then show the one-time upgrade thanks modal.
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
        if (session?.user?.id) {
          const key = `upgrade_thanks_shown_${session.user.id}`;
          if (!localStorage.getItem(key)) { localStorage.setItem(key, "1"); setShowUpgradeThanks(true); }
        }
      } else if (attempts >= 10) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [session]);

  // ─── HANDLERS ──────────────────────────────────────────────────────────────

  // showToast(msg, type) — "success" (green), "error" (red), "upgrade" (accent). 3.5s auto-dismiss.
  function showToast(msg, type = "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // setPalette — validates key, persists to localStorage, applies to current mode only.
  function setPalette(key) {
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

  // openUpgradeConfirm — single entry point for opening the upgrade consent modal.
  function openUpgradeConfirm(tier) {
    setUpgradeTargetTier(tier);
    setUpgradeAgreed(false);
    setShowUpgradeConfirm(true);
  }

  // handleExport — downloads all invoices + line items as a formatted CSV.
  // One row per line item; invoice fields repeat on each row so the file
  // opens cleanly in Excel / Google Sheets with no transformation needed.
  async function handleExport() {
    try {
      const ids = receipts.map((r) => r.id);
      const { data: items } = await supabase.from("line_items").select("*").in("receipt_id", ids);
      const byReceipt = {};
      (items || []).forEach((item) => {
        if (!byReceipt[item.receipt_id]) byReceipt[item.receipt_id] = [];
        byReceipt[item.receipt_id].push(item);
      });

      // Wrap a value in quotes and escape any internal quotes (RFC 4180)
      const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const num  = (v) => (v == null ? "" : Number(v).toFixed(2));

      const HEADERS = [
        "Invoice #", "Date", "Status", "Currency",
        "Issued By", "Billed To",
        "Item Description", "Qty", "Unit Price", "Item Total",
        "Subtotal", "Tax", "Invoice Total",
        "Notes",
      ];

      const rows = [HEADERS.map(cell).join(",")];

      receipts.forEach((r) => {
        const lineItems = byReceipt[r.id] || [];
        const base = [
          cell(r.receipt_number || ""),
          cell(r.date || ""),
          cell(r.status || ""),
          cell(r.currency || "CAD"),
          cell(r.vendor_name || ""),
          cell(r.customer_name || ""),
        ];
        const totals = [
          cell(num(r.subtotal)),
          cell(num(r.tax)),
          cell(num(r.total)),
          cell(r.notes || ""),
        ];

        if (lineItems.length === 0) {
          // Invoice with no line items — still emit one row
          rows.push([...base, cell(""), cell(""), cell(""), cell(""), ...totals].join(","));
        } else {
          lineItems.forEach((item, i) => {
            rows.push([
              ...base,
              cell(item.description || ""),
              cell(item.quantity ?? ""),
              cell(num(item.unit_price)),
              cell(num(item.total)),
              // Subtotal / tax / total / notes only on the first line item row to avoid repetition
              ...(i === 0 ? totals : [cell(""), cell(""), cell(""), cell("")]),
            ].join(","));
          });
        }
      });

      const csv  = rows.join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `invoiceprepper-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Export failed. Try again.", "error");
    }
  }

  // handleSaveReceipt — create or update. Updates list in-place, no full reload needed.
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

  // handleStatusChange — updates the list optimistically for instant UI feedback.
  // If the server call fails silently the user sees wrong status until refresh — acceptable tradeoff.
  async function handleStatusChange(id, status) {
    await updateReceipt(id, { status });
    setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (selected && selected.id === id) setSelected((s) => ({ ...s, status }));
    showToast(STATUS_LABELS[status] || "Status updated", "success");
  }

  // handleDelete — confirms before deleting. Shows receipt number in the confirm dialog.
  async function handleDelete(id) {
    const rec = receipts.find((r) => r.id === id);
    if (!window.confirm(`Delete invoice ${rec?.receipt_number ?? id}?`)) return;
    try {
      await deleteReceipt(id);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      if (selected && selected.id === id) setSelected(null);
    } catch {
      showToast("Delete failed. Please try again.", "error");
    }
  }

  // handleSendInvoice — emails the selected receipt to the client via the send-invoice Edge Function.
  // Builds a PDF in the browser and attaches it as base64. Draft invoices auto-advance to "sent".
  async function handleSendInvoice() {
    if (!sendInvoiceEmail) return;
    setSendInvoiceConfirming(false);
    setSendingInvoice(true);
    try {
      const r = sendInvoiceTarget;
      const { buildPDFBase64 } = await import("./components/ReceiptPDF");
      const pdfBase64 = await buildPDFBase64({
        ...r,
        logo_url:    r.logo_url || profile?.logo_url || null,
        logo_corner: r.logo_corner || null,
        tier:        profile?.tier ?? "free",
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
          to:             sendInvoiceEmail,
          vendor_name:    r.vendor_name,
          vendor_email:   profile?.email || "",
          vendor_address: profile?.address || "",
          customer_name:  r.customer_name,
          receipt_number: r.receipt_number,
          date:           r.date,
          line_items:     r.line_items,
          subtotal:       r.subtotal,
          tax:            r.tax,
          total:          r.total,
          currency:       r.currency || "CAD",
          notes:          r.notes,
          payment_url:    profile?.payment_url,
          tier:           profile?.tier ?? "free",
          logo_url:       r.logo_url || profile?.logo_url || null,
          logo_corner:    r.logo_corner || null,
          pdf_base64:     pdfBase64,
          is_reminder:    !!r._isReminder,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? "Send failed"); }

      // Draft invoices auto-advance to "sent" after a successful email.
      if (r.status === "draft") {
        await updateReceipt(r.id, { status: "sent" });
        setReceipts((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "sent" } : x)));
        if (selected?.id === r.id) setSelected((s) => ({ ...s, status: "sent" }));
      }

      showToast(`Invoice sent to ${sendInvoiceEmail}.`, "success");
      setSendInvoiceTarget(null);
      setSendInvoiceEmail("");
    } catch (err) {
      showToast(err.message || "Failed to send invoice.");
    }
    setSendingInvoice(false);
  }

  // selectFull — fetch a receipt by ID (includes line_items) and open the detail panel.
  // The list view only carries summary data, so a separate fetch is needed for the full object.
  async function selectFull(id) {
    const full = await fetchReceiptById(id);
    if (full?.error) return;
    setSelected(full);
  }

  function openNewReceipt() { setEditingReceipt(null); setShowForm(true); }

  // openEditReceipt — if the receipt doesn't have line_items yet (came from the list), fetch them first.
  async function openEditReceipt(receipt) {
    if (!receipt.line_items) {
      const full = await fetchReceiptById(receipt.id);
      setEditingReceipt(full?.error ? receipt : full);
    } else {
      setEditingReceipt(receipt);
    }
    setShowForm(true);
  }

  // ─── DERIVED VALUES ─────────────────────────────────────────────────────────

  // counts: { draft: N, sent: N, paid: N, voided: N } — used for sidebar badge numbers.
  const counts = useMemo(() => {
    const result = {};
    for (const status of Object.keys(STATUS_CONFIG)) {
      result[status] = receipts.filter((r) => r.status === status).length;
    }
    return result;
  }, [receipts]);

  // revenue: sum of paid receipts (pre-tax subtotal)
  const revenue = receipts
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + parseFloat(r.subtotal || 0), 0);

  // outstanding: sum of sent receipts (total including tax)
  const outstanding = receipts
    .filter((r) => r.status === "sent")
    .reduce((sum, r) => sum + parseFloat(r.total || 0), 0);

  // fmtStat: compact format for sidebar stat values — avoids overflow in narrow columns
  function fmtStat(n) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000)    return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  }

  const filtered = useMemo(() => {
    if (filter === "ALL") return receipts;
    return receipts.filter((r) => r.status === filter);
  }, [receipts, filter]);

  // selectedReceipt: merge selected (full object with line_items) with live status from the list.
  // Status buttons update `receipts` optimistically, but `selected` holds a snapshot from the fetch.
  let selectedReceipt = null;
  if (selected) {
    const live = receipts.find((r) => r.id === selected.id);
    selectedReceipt = { ...selected, status: live ? live.status : selected.status };
  }

  const userEmail  = session?.user?.email ?? "";
  const avatarUrl  = profile?.avatar_url || null;

  // Time-based greeting. Name priority: business_name > email username > nothing.
  const hour         = new Date().getHours();
  const salutation   = hour >= 5 && hour < 12 ? "Good morning"
                     : hour >= 12 && hour < 17 ? "Good afternoon"
                     : "Good evening";
  const greetingName = profile?.business_name || userEmail.split("@")[0] || "";
  const greeting     = greetingName ? `${salutation}, ${greetingName}` : salutation;

  // ─── EARLY RETURNS ──────────────────────────────────────────────────────────

  if (authLoading) return null;

  // Show landing whenever not entered OR entered but no session yet.
  // This ensures the AuthModal always has a back button (onBack resets to landing).
  if (!entered || !session) {
    return (
      <>
        <LandingPage
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(!darkMode)}
          currency={preferredCurrency}
          onCurrencyChange={handleCurrencyChange}
          onSignIn={() => { setAuthModalMode("login"); setShowAuthModal(true); }}
          onSignUp={() => { setAuthModalMode("signup"); setShowAuthModal(true); }}
          onEnter={() => {
            localStorage.setItem("app_entered", "1");
            setEntered(true);
            if (!session) setShowAuthModal(true);
          }}
          onEnterPro={() => {
            proIntentRef.current = "pro";
            localStorage.setItem("app_entered", "1");
            setEntered(true);
            if (session) { startCheckout("pro", preferredCurrency).catch(() => showToast("Couldn't open checkout. Try again.")); }
            else         { setShowAuthModal(true); }
          }}
          onEnterVoice={() => {
            // Store intent so checkout fires immediately after sign-up if not yet signed in.
            proIntentRef.current = "voice";
            localStorage.setItem("app_entered", "1");
            setEntered(true);
            if (session) { startCheckout("voice", preferredCurrency).catch(() => showToast("Couldn't open checkout. Try again.")); }
            else         { setShowAuthModal(true); }
          }}
        />
        {showAuthModal && (
          <AuthModal
            initialMode={authModalMode}
            onBack={() => { setShowAuthModal(false); localStorage.removeItem("app_entered"); setEntered(false); }}
            onClose={() => setShowAuthModal(false)}
          />
        )}
      </>
    );
  }

  // ─── 8. RENDER ──────────────────────────────────────────────────────────────

  return (
    <div className="app-shell">

      {/* ── TOPBAR ── 3 columns: mode+palette (left) | date (center) | avatar menu (right) */}
      <header className="topbar">

        {/* Column 1 — dark mode toggle + palette picker (Pro/Voice only) */}
        <div className="topbar-left">
          <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "Light" : "Dark"}
          </button>

          {!profileLoading && profile?.tier !== "pro" && profile?.tier !== "voice" && (
            <button className="btn btn-primary btn-upgrade-pill" onClick={() => setShowPlansModal(true)}>Upgrade</button>
          )}

          {(profile?.tier === "pro" || profile?.tier === "voice") && (
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
              <button
                className="palette-close-btn"
                onClick={() => setPaletteExpanded(false)}
                title="Close"
                aria-label="Close color picker"
              >✕</button>
            </div>
          </div>
          )}
        </div>

        {/* Column 2 — static day + date (no live clock, no re-renders) */}
        <div className="topbar-meta">
          {new Date().toLocaleDateString("en-CA", { weekday: "long", month: "short", day: "numeric" })}
        </div>

        {/* Column 3 — avatar dropdown menu */}
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

      {/* ── SIDEBAR ── stats, filter nav, + New Invoice button */}
      <aside className="sidebar">

        {/* Stats: revenue (paid, pre-tax), outstanding (sent, inc. tax), total count */}
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

        {/* Filter nav */}
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

        {/* Bottom: profile link, + New Invoice, utility row */}
        <div style={{ marginTop: "auto", padding: 12, borderTop: "1px solid var(--border-light)", display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ width: "100%", fontSize: 12, letterSpacing: "0.06em" }}
            onClick={() => setShowProfileModal(true)}
          >
            {profile?.business_name ? `✎ ${profile.business_name}` : "+ Add Business Profile"}
          </button>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={openNewReceipt}>
            + New Invoice
          </button>
          {/* Utility row: Billing + Terms centered, Upgrade pill + ? on right */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 4 }}>
            <button onClick={() => setShowBilling(true)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}>Billing</button>
            <button onClick={() => setLegal("terms")} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", padding: 0 }}>Terms</button>
            <button className="help-btn" onClick={() => setShowHelp(true)} aria-label="Help">?</button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── toolbar greeting + receipt grid + detail panel */}
      <main className="main">

        {/* Toolbar: greeting on the left, filter count on the right */}
        <div className="toolbar">
          <span className="toolbar-greeting">{greeting}</span>
          <span className="toolbar-title">
            {filter === "ALL" ? "All" : STATUS_CONFIG[filter]?.label}: {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="content-area">

          {/* Receipt grid */}
          <div className="receipt-grid-wrap">
            {loading ? (
              <div className="empty">Loading...</div>
            ) : filtered.length === 0 ? (
              /*
                Rendered outside the grid so it stretches the full container width.
                Inside the auto-fill grid it would only span one cell and left-align.
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
                      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                      onTouchMove={(e) => {
                        const dx     = e.touches[0].clientX - touchStartX.current;
                        const base   = swipedId === r.id ? -76 : 0;
                        const clamped = Math.max(Math.min(base + dx, 0), -76);
                        e.currentTarget.style.transition = "none";
                        e.currentTarget.style.transform  = `translateX(${clamped}px)`;
                      }}
                      onTouchEnd={(e) => {
                        // Snap open (swiped) if moved >40px left; snap closed if moved >30px right
                        const dx = e.changedTouches[0].clientX - touchStartX.current;
                        e.currentTarget.style.transition = "";
                        e.currentTarget.style.transform  = "";
                        if (swipedId === r.id) { if (dx > 30) setSwipedId(null); }
                        else                   { if (dx < -40) setSwipedId(r.id); }
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
                        <span className="card-total">{fmt(r.total)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── DETAIL PANEL ── shown when a receipt card is tapped/clicked */}
          {selectedReceipt && (
            <div className="detail-panel">

              {/* Header: edit / delete / close */}
              <div className="detail-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-ghost" style={{ border: "1px solid var(--border)" }} onClick={() => openEditReceipt(selectedReceipt)}>✎ Edit</button>
                    <button className="btn btn-danger" style={{ padding: "0 12px" }} onClick={() => handleDelete(selectedReceipt.id)}>✕ Delete</button>
                  </div>
                  <button onClick={() => setSelected(null)} className="btn-icon close-btn">✕</button>
                </div>
              </div>

              {/* Invoice document preview */}
              <div style={{ padding: "12px 14px 4px" }}>
                <div className="inv-doc">

                  {/* Dark header bar: INVOICE label + number */}
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
                        {selectedReceipt.date ? new Date(selectedReceipt.date).toLocaleDateString("en-CA") : "—"}
                      </div>
                      <span className={`stamp ${selectedReceipt.status}`} style={{ marginTop: 6 }}>
                        {selectedReceipt.status}
                      </span>
                    </div>
                  </div>

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

                  {/* Totals */}
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
                      <button key={s} className="btn btn-status" onClick={() => handleStatusChange(selectedReceipt.id, s)}>
                        {s}
                      </button>
                    ))}
                </div>
              </div>

              {/*
                QR code — only shown when:
                1. User has set a payment URL in their profile (e.g. Stripe or PayPal link)
                2. Receipt is not yet paid or voided
              */}
              {profile?.payment_url && !["paid", "voided"].includes(selectedReceipt.status) && (
                <div className="detail-section" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "16px 14px" }}>
                  <QRCodeSVG value={profile.payment_url} size={130} bgColor="#ffffff" fgColor="#111110" level="M" />
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", letterSpacing: "0.05em" }}>
                    Scan to pay · {fmt(selectedReceipt.total)}
                  </div>
                </div>
              )}

              {/* PDF actions */}
              <div className="detail-section">

                {/* Share Invoice (Web Share API — not available on all platforms) */}
                {"share" in navigator && (
                  <button
                    className="btn btn-ghost"
                    style={{ width: "100%", marginBottom: 6 }}
                    onClick={async () => (profile?.tier === "pro" || profile?.tier === "voice")
                      ? import("./components/ReceiptPDF").then(({ shareReceiptPDF }) => shareReceiptPDF({ ...selectedReceipt, logo_url: selectedReceipt.logo_url || profile?.logo_url, tier: profile?.tier }))
                      : showToast("Upgrade to Pro to share invoices.", "upgrade")
                    }
                  >
                    Share Invoice {!profileLoading && (profile?.tier === "free" || !profile?.tier) && <span style={{ fontSize: 9, letterSpacing: "0.1em", opacity: 0.5, marginLeft: 4 }}>PRO</span>}
                  </button>
                )}

                {/*
                  Preview PDF — per-platform strategy:
                    iOS (browser + PWA): blob: URLs blocked in iframes; download triggers Quick Look (native viewer).
                    Android / non-iOS mobile: Chrome supports blob: in iframes — show in-app overlay.
                    Desktop: open a new window synchronously to preserve user gesture, write <embed>.
                      If popup is blocked despite that, fall back to download.
                */}
                <button
                  className="btn btn-ghost"
                  style={{ width: "100%", marginBottom: 6 }}
                  onClick={async () => {
                    const { downloadReceiptPDF, getPDFBlobUrl } = await import("./components/ReceiptPDF");
                    const receiptData = { ...selectedReceipt, logo_url: selectedReceipt.logo_url || profile?.logo_url, tier: profile?.tier };
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                      (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));

                    if (isIOS) {
                      downloadReceiptPDF(receiptData);
                    } else if (window.innerWidth <= 768) {
                      const url = await getPDFBlobUrl(receiptData);
                      setPdfPreviewUrl(url);
                    } else {
                      const win = window.open("", "_blank");
                      const url = await getPDFBlobUrl(receiptData);
                      if (win) {
                        win.document.write(`<!DOCTYPE html><html><head><title>Invoice Preview</title></head><body style="margin:0;padding:0;height:100vh;"><embed src="${url}" type="application/pdf" width="100%" height="100%" /></body></html>`);
                        win.document.close();
                      } else {
                        downloadReceiptPDF(receiptData);
                      }
                    }
                  }}
                >
                  Preview PDF
                </button>

                {/* Download PDF */}
                <button
                  className="btn btn-download"
                  style={{ width: "100%", marginBottom: 6 }}
                  onClick={async () => { const { downloadReceiptPDF } = await import("./components/ReceiptPDF"); downloadReceiptPDF({ ...selectedReceipt, logo_url: selectedReceipt.logo_url || profile?.logo_url, tier: profile?.tier }); }}
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

                {/* Send to Client — Pro feature, inline email input + 2-step confirmation */}
                <div style={{ marginTop: 6, borderTop: "1px solid var(--border-light)", paddingTop: 10 }}>
                  {sendInvoiceTarget?.id === selectedReceipt.id ? (
                    <div>
                      {sendInvoiceConfirming ? (
                        // Step 2: confirm
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
                        // Step 1: enter email
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
                      onClick={() => {
                        if (profile?.tier !== "pro" && profile?.tier !== "voice") { openUpgradeConfirm("pro"); return; }
                        setSendInvoiceTarget(selectedReceipt);
                        setSendInvoiceEmail("");
                      }}
                    >
                      ✉ Send to Client
                      {(!profile?.tier || profile?.tier === "free") && (
                        <span style={{ fontSize: 9, letterSpacing: "0.1em", opacity: 0.5, marginLeft: 6 }}>PRO</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── 9. MODALS ──────────────────────────────────────────────────────────
          Each modal is a separate component file in src/components/.
          This section is just the mount conditions and prop wiring.       */}

      {/* Create / edit invoice form */}
      {showForm && (
        <ReceiptForm
          initialData={editingReceipt}
          profile={profile}
          userEmail={userEmail}
          onLogoUpdate={(url) => setProfile((p) => ({ ...p, logo_url: url }))}
          onUpgradeClick={() => openUpgradeConfirm("pro")}
          onSubmit={handleSaveReceipt}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Sign in / sign up */}
      {showAuthModal && (
        <AuthModal initialMode={authModalMode} onClose={() => setShowAuthModal(false)} />
      )}

      {/* Password reset (linked from email) */}
      {showPasswordUpdate && (
        <PasswordUpdateModal onClose={() => setShowPasswordUpdate(false)} />
      )}

      {/* Help */}
      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} isPro={profile?.tier === "pro" || profile?.tier === "voice"} onLegal={setLegal} />
      )}

      {/* Legal (terms / privacy) */}
      {legal && <LegalModal type={legal} onClose={() => setLegal(null)} />}

      {/* Billing */}
      {showBilling && (
        <BillingModal profile={profile} onClose={() => setShowBilling(false)} onUpgrade={() => setShowPlansModal(true)} />
      )}

      {/* Profile / settings */}
      {showProfileModal && (
        <ProfileModal
          profile={profile}
          userEmail={session?.user?.email}
          onSave={(p) => setProfile(p)}
          onClose={() => setShowProfileModal(false)}
          onUpgradeClick={() => { setShowProfileModal(false); setShowPlansModal(true); }}
          onExport={handleExport}
        />
      )}

      {/* Plans (choose Pro or Voice AI) */}
      {showPlansModal && (
        <PlansModal
          profile={profile}
          darkMode={darkMode}
          currency={profile?.currency || preferredCurrency}
          onClose={() => setShowPlansModal(false)}
          onSelectPro={()   => { setShowPlansModal(false); openUpgradeConfirm("pro");   }}
          onSelectVoice={()  => { setShowPlansModal(false); openUpgradeConfirm("voice"); }}
        />
      )}

      {/* Pre-Stripe consent (user must agree to recurring billing) */}
      {showUpgradeConfirm && (
        <UpgradeConfirmModal
          targetTier={upgradeTargetTier}
          agreed={upgradeAgreed}
          onAgreeChange={(e) => setUpgradeAgreed(e.target.checked)}
          onClose={() => setShowUpgradeConfirm(false)}
          onConfirm={() => { setShowUpgradeConfirm(false); startCheckout(upgradeTargetTier, profile?.currency).catch(() => showToast("Couldn't open checkout. Try again.")); }}
          onOpenLegal={(type) => setUpgradeLegal(type)}
        />
      )}
      {/* Legal links inside upgrade confirm modal open a second LegalModal on top */}
      {upgradeLegal && <LegalModal type={upgradeLegal} onClose={() => setUpgradeLegal(null)} />}

      {/* In-app PDF preview overlay (Android mobile only) */}
      {pdfPreviewUrl && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", flexDirection: "column", background: "#000", paddingTop: "env(safe-area-inset-top)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "var(--surface)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>Invoice Preview</span>
            <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={() => { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); }}>Close</button>
          </div>
          <iframe src={pdfPreviewUrl} title="Invoice Preview" style={{ flex: 1, border: "none", width: "100%" }} />
        </div>
      )}

      {/* Welcome (new user, shown once) */}
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}

      {/* Upgrade thanks (post-checkout, shown once) */}
      {showUpgradeThanks && <UpgradeThanksModal onClose={() => setShowUpgradeThanks(false)} />}

      {/* Toast: success (green) / upgrade (accent copper) / error (red) */}
      {toast && (
        <div
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: toast.type === "success" ? "var(--paid)" : toast.type === "upgrade" ? "var(--accent)" : "var(--voided)",
            color: "#fff", padding: "10px 20px", fontSize: 10, letterSpacing: "0.15em",
            textTransform: "uppercase", fontFamily: "var(--mono)", zIndex: 500,
            border: "1px solid rgba(0,0,0,0.2)", boxShadow: "2px 2px 0 rgba(0,0,0,0.15)",
            whiteSpace: "nowrap", cursor: toast.type === "upgrade" ? "pointer" : "default",
          }}
          onClick={toast.type === "upgrade" ? () => openUpgradeConfirm("pro") : undefined}
        >
          {toast.msg}{toast.type === "upgrade" ? " →" : ""}
        </div>
      )}

    </div>
  );
}
