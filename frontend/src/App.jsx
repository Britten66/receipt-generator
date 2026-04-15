import { useState, useEffect } from "react";
import ReceiptForm         from "./features/invoices/ReceiptForm";
import LandingPage         from "./layout/LandingPage";
import AuthModal           from "./features/auth/AuthModal";
import ProfileModal        from "./features/profile/ProfileModal";
import PasswordUpdateModal from "./features/profile/PasswordUpdateModal";
import HelpModal           from "./features/profile/HelpModal";
import LegalModal          from "./features/profile/LegalModal";
import BillingModal        from "./features/billing/BillingModal";
import PlansModal          from "./features/billing/PlansModal";
import UpgradeConfirmModal from "./features/billing/UpgradeConfirmModal";
import WelcomeModal        from "./features/auth/WelcomeModal";
import ConsentModal        from "./features/auth/ConsentModal";
import UpgradeThanksModal  from "./features/billing/UpgradeThanksModal";
import posthog             from "posthog-js";
import { startCheckout }   from "./api/billing";
import { fetchProfile, saveProfile } from "./api/profile";
import { exportInvoicesCSV } from "./services/csvExport";
import { applyPalette, clearPalette, PALETTE_KEYS, readPaletteFromStorage } from "./lib/themes";
import { STATUS_CONFIG } from "./lib/constants";
import { useAuth } from "./features/auth/AuthContext";
import { useInvoices } from "./features/invoices/useInvoices";
import AppTopbar       from "./layout/AppTopbar";
import AppSidebar      from "./layout/AppSidebar";
import InvoiceGrid     from "./features/invoices/InvoiceGrid";
import InvoiceDetail   from "./features/invoices/InvoiceDetail";
import TrashModal      from "./features/invoices/trash/TrashModal";
import "./App.css";

// ─── 3. APP COMPONENT ────────────────────────────────────────────────────────

export default function App() {

  // ─── STATE ─────────────────────────────────────────────────────────────────

  // Theme
  // ─── AUTH + PROFILE (from AuthContext) ────────────────────────────────────
  const {
    session, authLoading,
    showAuthModal, setShowAuthModal,
    authModalMode, setAuthModalMode,
    showPasswordUpdate, setShowPasswordUpdate,
    entered, setEntered,
    preferredCurrency, handleCurrencyChange,
    profile, setProfile, profileLoading,
    showWelcome, setShowWelcome,
    proIntentRef,
  } = useAuth();

  // ─── THEME ─────────────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("dark_mode") === "1");
  const [lightPalette, setLightPaletteState] = useState(() => readPaletteFromStorage("theme_light_palette"));
  const [darkPalette,  setDarkPaletteState]  = useState(() => readPaletteFromStorage("theme_dark_palette"));
  const [paletteExpanded, setPaletteExpanded] = useState(false);
  const currentPalette = darkMode ? darkPalette : lightPalette;

  // ─── UI STATE ──────────────────────────────────────────────────────────────
  const [swipedId, setSwipedId] = useState(null);
const [showProfileModal, setShowProfileModal]           = useState(false);
  const [showHelp, setShowHelp]                           = useState(false);
  const [showBilling, setShowBilling]                     = useState(false);
  const [showTrash, setShowTrash]                         = useState(false);
  const [showPlansModal, setShowPlansModal]               = useState(false);
  const [showUpgradeThanks, setShowUpgradeThanks]         = useState(false);
  const [legal, setLegal]                                 = useState(null);
  const [upgradeLegal, setUpgradeLegal]                   = useState(null);
  const [showUpgradeConfirm, setShowUpgradeConfirm]       = useState(false);
  const [upgradeAgreed, setUpgradeAgreed]                 = useState(false);
  const [upgradeTargetTier, setUpgradeTargetTier]         = useState("pro");
  const [pdfPreviewUrl, setPdfPreviewUrl]                 = useState(null);
  const [toast, setToast]                                 = useState(null);
  const [showConsent, setShowConsent]                     = useState(false);

  // ─── INVOICES (from useInvoices hook) ──────────────────────────────────────
  function showToast(msg, type = "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const {
    receipts, loading, filter, setFilter,
    setSelected, selectedReceipt,
    showForm, setShowForm,
    editingReceipt,
    loadReceipts,
    handleSaveReceipt, handleStatusChange, handleDelete,
    selectFull, openNewReceipt, openEditReceipt,
    counts, revenue, outstanding, filtered,
  } = useInvoices({ session, profile, showToast });

// ─── EFFECTS ───────────────────────────────────────────────────────────────

  // Load receipts when session changes
  useEffect(() => {
    if (!session) return;
    loadReceipts();
  }, [session]);

  // Show consent modal for users who have not yet agreed (covers Google OAuth users)
  useEffect(() => {
    if (!session || profileLoading) return;
    if (!profile?.terms_agreed_at) setShowConsent(true);
  }, [session, profile, profileLoading]);

  async function handleConsentAccept({ optIn }) {
    const consentAt = new Date().toISOString();
    await saveProfile({ terms_agreed_at: consentAt, email_marketing_ok: optIn });
    localStorage.setItem("consent_at", consentAt);
    localStorage.setItem("email_opt_in", optIn ? "1" : "0");
    setProfile((p) => ({ ...p, terms_agreed_at: consentAt, email_marketing_ok: optIn }));
    setShowConsent(false);
  }

  // Dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("dark_mode", "1");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("dark_mode", "0");
    }
  }, [darkMode]);

  // Palette
  useEffect(() => {
    if (!entered) { clearPalette(); return; }
    applyPalette(currentPalette, darkMode ? "dark" : "light");
  }, [entered, currentPalette, darkMode]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const anyOpen = showForm || showProfileModal || showHelp || showBilling || !!legal || !!upgradeLegal
      || showUpgradeConfirm || showWelcome || showUpgradeThanks || showPlansModal || showAuthModal || !!pdfPreviewUrl || showConsent;
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
  }, [showForm, showProfileModal, showHelp, showBilling, legal, upgradeLegal, showUpgradeConfirm, showWelcome, showUpgradeThanks, showPlansModal, showAuthModal, pdfPreviewUrl, showConsent]);

  // Post-checkout upgrade poll
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
        posthog.capture("plan_upgraded", { plan: p.tier, invoice_count: receipts.length });
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

  function openUpgradeConfirm(tier) {
    setUpgradeTargetTier(tier);
    setUpgradeAgreed(false);
    setShowUpgradeConfirm(true);
  }

  async function handleExport() {
    try {
      await exportInvoicesCSV(receipts);
    } catch {
      showToast("Export failed. Try again.", "error");
    }
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

      <AppTopbar
        darkMode={darkMode} setDarkMode={setDarkMode}
        profile={profile} profileLoading={profileLoading}
        userEmail={userEmail} avatarUrl={avatarUrl}
        currentPalette={currentPalette}
        paletteExpanded={paletteExpanded} setPaletteExpanded={setPaletteExpanded}
        setPalette={setPalette}
        setShowPlansModal={setShowPlansModal} setShowProfileModal={setShowProfileModal}
      />

      <AppSidebar
        receipts={receipts} revenue={revenue} outstanding={outstanding} counts={counts}
        filter={filter} setFilter={setFilter}
        profile={profile}
        setShowProfileModal={setShowProfileModal} openNewReceipt={openNewReceipt}
        setShowBilling={setShowBilling} setLegal={setLegal} setShowHelp={setShowHelp} setShowTrash={setShowTrash}
      />

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
          <div className="receipt-grid-wrap">
            <InvoiceGrid
              loading={loading} filtered={filtered} selectedReceipt={selectedReceipt}
              swipedId={swipedId} setSwipedId={setSwipedId}
              handleDelete={handleDelete} selectFull={selectFull}
            />
          </div>
          <InvoiceDetail
            selectedReceipt={selectedReceipt} profile={profile}
            setSelected={setSelected} openEditReceipt={openEditReceipt}
            handleDelete={handleDelete} handleStatusChange={handleStatusChange}
            setPdfPreviewUrl={setPdfPreviewUrl} showToast={showToast}
          />
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

      {/* Consent (Google OAuth users who skipped signup form, shown once) */}
      {showConsent && (
        <ConsentModal
          onAccept={handleConsentAccept}
          onOpenLegal={(type) => setLegal(type)}
        />
      )}

      {/* Welcome (new user, shown once) */}
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}

      {showTrash && (
        <TrashModal
          onClose={() => setShowTrash(false)}
          showToast={showToast}
          onRestored={loadReceipts}
        />
      )}

      {/* Upgrade thanks (post-checkout, shown once) */}
      {showUpgradeThanks && <UpgradeThanksModal onClose={() => setShowUpgradeThanks(false)} />}

      {/* Feedback button: floating bottom-right, authenticated users only */}
      {session && (
        <a
          href="https://tally.so/r/2EJZRM"
          target="_blank"
          rel="noopener noreferrer"
          className="feedback-fab"
          onClick={() => posthog.capture("feedback_clicked", { tier: profile?.tier ?? "free" })}
          aria-label="Send feedback"
        >
          Feedback
        </a>
      )}


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
