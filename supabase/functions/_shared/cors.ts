const ALLOWED_ORIGINS = new Set([
  "https://invoiceprepper.com",
  "https://www.invoiceprepper.com",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
]);

export function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://invoiceprepper.com";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, content-length",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Vary": "Origin",
  };
}

// Legacy export: use getCorsHeaders(origin) in new code
export const corsHeaders = getCorsHeaders(null);
