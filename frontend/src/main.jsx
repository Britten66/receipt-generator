import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import AdminPage from './features/admin/AdminPage.jsx'
import { AuthProvider } from './features/auth/AuthContext.jsx'
import { captureRefFromUrl } from './api/referrals.js'

captureRefFromUrl();

// Sentry: only initialises when VITE_SENTRY_DSN is set (production).
// In dev the DSN env var is absent so Sentry stays silent.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,       // no performance tracing, just errors
    sendDefaultPii: false,     // never send user PII
  });
}

posthog.init('phc_ymHXC8Q7wirEnDPba3k68eoLuipzCGYn6Q8UizA4uLFz', {
  api_host: 'https://us.i.posthog.com',
  capture_pageview: true,
  capture_pageleave: true,
  // autocapture is off: invoice forms contain sensitive client/financial data
  // that should never be sent to a third-party analytics service.
  autocapture: false,
  disable_session_recording: true,
  // mask_all_text as an extra safety net in case autocapture is ever re-enabled
  mask_all_text: true,
  mask_all_element_attributes: true,
})

function ErrorFallback() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "monospace", color: "#5a5752", gap: 16 }}>
      <p style={{ fontSize: 13, letterSpacing: "0.08em" }}>Something went wrong. Please reload the page.</p>
      <button onClick={() => window.location.reload()} style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", padding: "8px 18px", cursor: "pointer", background: "#1e1c18", color: "#f5f4f0", border: "none" }}>
        Reload
      </button>
    </div>
  );
}

const isAdminRoute = window.location.pathname === '/admin';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <AuthProvider>
        {isAdminRoute ? <AdminPage /> : <App />}
      </AuthProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
