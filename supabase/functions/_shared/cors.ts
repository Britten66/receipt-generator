// Production origins must be explicit. Localhost on any port is allowed for dev
// because Vite picks whatever port is free (5173, 5174, 5175, 5176...).
const ALLOWED_PROD_ORIGINS = new Set([
  "https://invoiceprepper.com",
  "https://www.invoiceprepper.com",
]);
const LOCALHOST_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_PROD_ORIGINS.has(origin)) return true;
  return LOCALHOST_RE.test(origin);
}

export function getCorsHeaders(origin: string | null) {
  const allowed = isAllowed(origin) ? origin! : "https://invoiceprepper.com";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, content-length",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Vary": "Origin",
  };
}

// Legacy export: use getCorsHeaders(origin) in new code
export const corsHeaders = getCorsHeaders(null);
