/*
  notify-signup — fires when a new user is created in auth.users.

  WIRED UP VIA:
  ─────────────
  Supabase Dashboard → Database → Webhooks → Create webhook
  Schema: auth   Table: users   Event: INSERT
  URL:   https://qajcynqmjtlzofoyklyp.supabase.co/functions/v1/notify-signup
  HTTP Headers: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>

  Using a Database Webhook (not Auth Hook) because Auth Hooks are synchronous
  and can block user creation if the function errors. Database Webhooks are
  async and fire after the user is safely written to the database.

  PAYLOAD FORMAT (database webhook):
  {
    "type": "INSERT",
    "schema": "auth",
    "table": "users",
    "record": { "id": "...", "email": "...", "created_at": "..." },
    "old_record": null
  }
*/

import { createPostHogClient } from "../_shared/posthog.ts";

const RESEND_FROM = "noreply@invoiceprepper.com";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Verify the request is from Supabase using the service role key
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const notifyEmail    = Deno.env.get("NOTIFY_EMAIL");
  const resendKey      = Deno.env.get("RESEND_API_KEY");

  if (!serviceRoleKey || !notifyEmail || !resendKey) {
    console.error("notify-signup: missing required env vars");
    return new Response(JSON.stringify({ ok: false, error: "misconfigured" }), { status: 200 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.includes(serviceRoleKey)) {
    console.error("notify-signup: unauthorized request");
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  // Database webhook sends record at payload.record
  // Fall back to payload.user or payload itself for backwards compatibility
  const record    = (payload?.record ?? payload?.user ?? payload) as Record<string, unknown>;
  const email     = (record?.email as string) ?? "unknown";
  const userId    = (record?.id as string) ?? "unknown";
  const createdAt = record?.created_at
    ? new Date(record.created_at as string).toLocaleString("en-CA", { timeZone: "UTC" }) + " UTC"
    : new Date().toUTCString();

  const adminHtml = `
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

  const welcomeHtml = `
    <div style="font-family:helvetica,arial,sans-serif;max-width:520px;margin:0 auto;background:#f5f4f0;">
      <div style="background:#1e1c18;padding:20px 32px;">
        <span style="color:#e7ddc7;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">InvoicePrepper</span>
      </div>
      <div style="padding:36px 32px 28px;">
        <h1 style="font-size:22px;font-weight:700;color:#1e1c18;margin:0 0 8px;letter-spacing:-0.02em;">Your account is ready.</h1>
        <p style="font-size:14px;color:#5a5752;line-height:1.6;margin:0 0 28px;">
          Welcome to InvoicePrepper. Here is everything you need to send your first invoice in the next five minutes.
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
          <tr>
            <td style="padding:14px 0;border-top:1px solid #e0ddd6;vertical-align:top;width:28px;">
              <span style="font-family:monospace;font-size:10px;font-weight:700;color:#a06830;letter-spacing:0.1em;">01</span>
            </td>
            <td style="padding:14px 0 14px 14px;border-top:1px solid #e0ddd6;">
              <div style="font-size:13px;font-weight:600;color:#1e1c18;margin-bottom:3px;">Create your first invoice</div>
              <div style="font-size:12px;color:#7a7672;line-height:1.5;">Hit <strong>+ New Invoice</strong>, fill in your client name and what you did. Takes under a minute.</div>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0;border-top:1px solid #e0ddd6;vertical-align:top;">
              <span style="font-family:monospace;font-size:10px;font-weight:700;color:#a06830;letter-spacing:0.1em;">02</span>
            </td>
            <td style="padding:14px 0 14px 14px;border-top:1px solid #e0ddd6;">
              <div style="font-size:13px;font-weight:600;color:#1e1c18;margin-bottom:3px;">Download or share the PDF</div>
              <div style="font-size:12px;color:#7a7672;line-height:1.5;">Every invoice generates a clean PDF instantly. Download it or copy a share link to send to your client.</div>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0;border-top:1px solid #e0ddd6;vertical-align:top;">
              <span style="font-family:monospace;font-size:10px;font-weight:700;color:#a06830;letter-spacing:0.1em;">03</span>
            </td>
            <td style="padding:14px 0 14px 14px;border-top:1px solid #e0ddd6;">
              <div style="font-size:13px;font-weight:600;color:#1e1c18;margin-bottom:3px;">Track what gets paid</div>
              <div style="font-size:12px;color:#7a7672;line-height:1.5;">Mark invoices Draft, Sent, or Paid. Your outstanding balance updates automatically so nothing slips through.</div>
            </td>
          </tr>
        </table>
        <a href="https://invoiceprepper.com" style="display:inline-block;background:#1e1c18;color:#f5f4f0;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;padding:13px 28px;text-decoration:none;">
          Open InvoicePrepper
        </a>
      </div>
      <div style="padding:18px 32px 24px;border-top:1px solid #e0ddd6;">
        <p style="font-size:11px;color:#b4afa5;margin:0;line-height:1.6;">
          Questions? Reply to this email or reach us at
          <a href="mailto:support@invoiceprepper.com" style="color:#a06830;text-decoration:none;">support@invoiceprepper.com</a>
        </p>
        <p style="font-size:10px;color:#c4c0b8;margin:8px 0 0;">
          invoiceprepper.com - built for independent workers, contractors and small businesses.
        </p>
      </div>
    </div>`;

  // Send admin notification
  const adminRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
    body: JSON.stringify({ from: RESEND_FROM, to: notifyEmail, subject: `New signup: ${email}`, html: adminHtml }),
  });
  if (!adminRes.ok) {
    const err = await adminRes.json().catch(() => ({}));
    console.error("notify-signup: admin email error", JSON.stringify(err));
  }

  // Send welcome email to the new user (only if they have a real email)
  if (email && email !== "unknown" && email.includes("@")) {
    const welcomeRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "InvoicePrepper <noreply@invoiceprepper.com>",
        to: email,
        subject: "Your InvoicePrepper account is ready",
        html: welcomeHtml,
      }),
    });
    if (!welcomeRes.ok) {
      const err = await welcomeRes.json().catch(() => ({}));
      console.error("notify-signup: welcome email error", JSON.stringify(err));
    }
  }

  if (userId && userId !== "unknown") {
    const ph = createPostHogClient();
    ph.identify({
      distinctId: userId,
      properties: {
        $set: { email, tier: "free" },
        $set_once: { created_at: createdAt },
      },
    });
    ph.capture({
      distinctId: userId,
      event: "user signed up",
      properties: { email },
    });
    await ph.shutdown();
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
