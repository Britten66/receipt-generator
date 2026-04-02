/*
  notify-signup — fires when a new user registers via Supabase Auth.

  HOW TO WIRE IT UP (one-time setup in Supabase dashboard):
  ─────────────────────────────────────────────────────────
  1. Deploy this function: supabase functions deploy notify-signup
  2. Supabase Dashboard → Authentication → Hooks
  3. Add hook: "Send Email" → event: "after user is created"
     URL: https://<project-ref>.supabase.co/functions/v1/notify-signup
  4. Copy the "signing secret" Supabase shows you.
  5. In Supabase Dashboard → Edge Functions → notify-signup → Secrets, add:
       NOTIFY_SIGNUP_SECRET = <that signing secret>
       NOTIFY_EMAIL         = <your email address, e.g. you@example.com>
     RESEND_API_KEY is already set project-wide.

  SECURITY:
  ─────────
  Supabase signs every Auth Hook request with HMAC-SHA256.
  This function verifies the signature before doing anything.
  Requests without a valid signature return 401 and are ignored.
*/

const RESEND_FROM = "noreply@invoiceprepper.com";

async function verifySignature(req: Request, secret: string): Promise<boolean> {
  const signature = req.headers.get("x-supabase-signature");
  if (!signature) return false;

  const body = await req.text();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(body));
  return valid;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const secret = Deno.env.get("NOTIFY_SIGNUP_SECRET");
  const notifyEmail = Deno.env.get("NOTIFY_EMAIL");
  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (!secret || !notifyEmail || !resendKey) {
    console.error("notify-signup: missing required env vars");
    // Return 200 so Supabase doesn't retry — misconfiguration, not a transient error
    return new Response(JSON.stringify({ ok: false, error: "misconfigured" }), { status: 200 });
  }

  // Clone before verifySignature reads the body, then re-parse
  const cloned = req.clone();
  const isValid = await verifySignature(cloned, secret);
  if (!isValid) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const payload = await req.json();
  const user = payload?.user ?? payload; // Supabase hook payload shape
  const email = user?.email ?? "unknown";
  const userId = user?.id ?? "unknown";
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleString("en-CA", { timeZone: "UTC" }) + " UTC"
    : new Date().toUTCString();

  const html = `
    <div style="font-family:helvetica,arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <div style="background:#1e1c18;padding:16px 20px;margin-bottom:20px;">
        <span style="color:#fff;font-size:12px;font-weight:700;letter-spacing:0.1em;">INVOICEPREPPER</span>
      </div>
      <h2 style="font-size:18px;color:#1e1c18;margin-bottom:8px;">New user registered</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:8px 0;color:#908e8a;width:100px;">Email</td><td style="padding:8px 0;color:#1e1c18;">${email}</td></tr>
        <tr><td style="padding:8px 0;color:#908e8a;">User ID</td><td style="padding:8px 0;color:#1e1c18;font-family:monospace;font-size:11px;">${userId}</td></tr>
        <tr><td style="padding:8px 0;color:#908e8a;">Signed up</td><td style="padding:8px 0;color:#1e1c18;">${createdAt}</td></tr>
      </table>
      <div style="margin-top:24px;font-size:11px;color:#b4afa5;border-top:1px solid #e8e6e1;padding-top:14px;">
        Sent automatically by InvoicePrepper — <a href="https://invoiceprepper.com" style="color:#b4afa5;">invoiceprepper.com</a>
      </div>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: notifyEmail,
      subject: `New signup: ${email}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("notify-signup: Resend error", JSON.stringify(err));
    // Return 200 so Supabase doesn't retry on Resend failures — log and move on
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
