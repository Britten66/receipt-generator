import { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { startCheckout } from "../../api/billing";
import { fetchProfile } from "../../api/profile";
import posthog from "posthog-js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]                     = useState(null);
  const [authLoading, setAuthLoading]             = useState(true);
  const [showAuthModal, setShowAuthModal]         = useState(false);
  const [authModalMode, setAuthModalMode]         = useState("signup");
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const [entered, setEntered]                     = useState(() => !!localStorage.getItem("app_entered"));
  const [preferredCurrency, setPreferredCurrency] = useState(
    () => localStorage.getItem("preferred_currency") || "CAD"
  );
  const [profile, setProfile]                     = useState(null);
  const [profileLoading, setProfileLoading]       = useState(true);
  const [showWelcome, setShowWelcome]             = useState(false);
  const proIntentRef                              = useRef("");

  function handleCurrencyChange(val) {
    setPreferredCurrency(val);
    localStorage.setItem("preferred_currency", val);
  }

  // Auth listener
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

      if (event === "INITIAL_SESSION" && newSession) {
        try {
          const { exp } = JSON.parse(atob(newSession.access_token.split(".")[1]));
          if (exp * 1000 < Date.now()) return;
        } catch { /* malformed token: fall through */ }
      }

      if (!newSession) {
        setSession(null);
        if (event === "SIGNED_OUT") { localStorage.removeItem("app_entered"); setEntered(false); posthog.reset(); }
        setShowAuthModal(false);
      } else {
        setSession(newSession);
        setShowAuthModal(false);
        setEntered(true);
        if (event === "SIGNED_IN") posthog.identify(newSession.user.id);

        if (proIntentRef.current) {
          startCheckout(proIntentRef.current, profile?.currency || preferredCurrency).catch(() => {});
          proIntentRef.current = "";
        }

        if (event === "SIGNED_IN" && newSession?.user?.created_at) {
          const ageMs = Date.now() - new Date(newSession.user.created_at).getTime();
          if (ageMs < 2 * 60 * 1000) {
            setShowWelcome(true);
            posthog.capture("signup_completed", {
              method: newSession.user.app_metadata?.provider ?? "email",
            });
          }
        }
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load profile when session changes
  useEffect(() => {
    if (!session) return;
    fetchProfile().then((p) => {
      setProfile(p || null);
      setProfileLoading(false);
    });
  }, [session]);

  // Open signup modal when arriving from SEO pages with ?signup=1
  useEffect(() => {
    if (session) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("signup")) return;
    window.history.replaceState({}, "", window.location.pathname);
    setAuthModalMode("signup");
    setShowAuthModal(true);
  }, [session]);

  return (
    <AuthContext.Provider value={{
      session, authLoading,
      showAuthModal, setShowAuthModal,
      authModalMode, setAuthModalMode,
      showPasswordUpdate, setShowPasswordUpdate,
      entered, setEntered,
      preferredCurrency, handleCurrencyChange,
      profile, setProfile, profileLoading,
      showWelcome, setShowWelcome,
      proIntentRef,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
