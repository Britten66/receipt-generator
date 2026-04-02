const ALLOWED_ORIGINS = new Set([
  "https://invoiceprepper.com",
  "https://www.invoiceprepper.com",
  "http://localhost:5173",
  "http://localhost:3000",
]);

export function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://invoiceprepper.com";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Vary": "Origin",
  };
}

// Legacy export — use getCorsHeaders(origin) in new code
export const corsHeaders = getCorsHeaders(null);
