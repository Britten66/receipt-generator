/*
  notify-signup — fires when a new user registers via Supabase Auth.

  WIRED UP VIA:
  ─────────────
  Supabase Dashboard → Authentication → Hooks
  Event: "After user is created"
  URL:   https://qajcynqmjtlzofoyklyp.supabase.co/functions/v1/notify-signup
  Signing secret: the v1,whsec_... value Supabase generated — stored as NOTIFY_SIGNUP_SECRET

  SECURITY:
  ─────────
  Supabase signs every Auth Hook request in the format:
    Header: x-supabase-signature: v1=<hex-encoded-hmac-sha256>
    Secret:  stored as v1,whsec_<base64-encoded-raw-bytes>

  We decode the raw bytes from the secret, compute HMAC-SHA256 of the body,
  and compare hex outputs. Requests with invalid or missing signatures return 401.
*/

const RESEND_FROM = "noreply@invoiceprepper.com";

/*
  verifySignature — handles the Supabase Auth Hook signing format.

  Secret format:   v1,whsec_<base64>  → strip prefix, base64-decode to raw bytes
  Signature header: v1=<hex>          → strip prefix, hex-decode to bytes
  Then HMAC-SHA256 verify(rawSecretBytes, body) === sigBytes
*/
async function verifySignature(body: string, signatureHeader: string | null, rawSecret: string): Promise<boolean> {
  if (!signatureHeader) return false;

  try {
    // Parse the secret: "v1,whsec_<base64>" → raw bytes
    const whsecMatch = rawSecret.match(/whsec_([A-Za-z0-9+/=]+)/);
    if (!whsecMatch) return false;
    const secretBytes = Uint8Array.from(atob(whsecMatch[1]), (c) => c.charCodeAt(0));

    // Parse the signature header: "v1=<hex>" → bytes
    const hexMatch = signatureHeader.match(/v1=([0-9a-f]+)/i);
    if (!hexMatch) return false;
    const sigBytes = new Uint8Array(hexMatch[1].match(/.{2}/g)!.map((b) => parseInt(b, 16)));

    const key = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    return await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(body));
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const rawSecret   = Deno.env.get("NOTIFY_SIGNUP_SECRET");
  const notifyEmail = Deno.env.get("NOTIFY_EMAIL");
  const resendKey   = Deno.env.get("RESEND_API_KEY");

  if (!rawSecret || !notifyEmail || !resendKey) {
    console.error("notify-signup: missing required env vars");
    return new Response(JSON.stringify({ ok: false, error: "misconfigured" }), { status: 200 });
  }

  const body      = await req.text();
  const sigHeader = req.headers.get("x-supabase-signature");
  const isValid   = await verifySignature(body, sigHeader, rawSecret);

  if (!isValid) {
    console.error("notify-signup: invalid signature", sigHeader);
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const user      = (payload?.user ?? payload) as Record<string, unknown>;
  const email     = (user?.email as string) ?? "unknown";
  const userId    = (user?.id as string) ?? "unknown";
  const createdAt = user?.created_at
    ? new Date(user.created_at as string).toLocaleString("en-CA", { timeZone: "UTC" }) + " UTC"
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
        Sent automatically by <a href="https://invoiceprepper.com" style="color:#b4afa5;">invoiceprepper.com</a>
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
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
