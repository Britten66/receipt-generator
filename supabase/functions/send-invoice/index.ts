import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createPostHogClient } from "../_shared/posthog.ts";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES  = 3 * 1024 * 1024; // 3 MB (covers PDF attachment)
const MAX_PDF_BYTES   = 2 * 1024 * 1024; // 2 MB base64 ≈ ~1.5 MB PDF
const MAX_FIELD_LEN   = 500;

function escapeHtml(str: unknown): string {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  // Fetch tier + custom sender name — both used server-side, never trusted from client
  const { data: profile } = await supabase.from("profiles").select("tier, business_name").eq("user_id", user.id).single();
  const isPro = profile?.tier === "pro" || profile?.tier === "voice";

  const {
    to, vendor_name, vendor_email, vendor_address,
    customer_name, receipt_number, date, line_items,
    subtotal, tax, total, currency, notes, payment_url, pdf_base64,
    is_reminder,
  } = await req.json();
  const tier = profile?.tier ?? "free"; // use server-verified tier, not client-supplied

  if (!to) return new Response(JSON.stringify({ error: "Recipient email is required" }), { status: 400, headers: corsHeaders });
  if (!EMAIL_RE.test(to)) return new Response(JSON.stringify({ error: "Invalid recipient email" }), { status: 400, headers: corsHeaders });
  if (pdf_base64 && pdf_base64.length > MAX_PDF_BYTES) {
    return new Response(JSON.stringify({ error: "PDF attachment too large" }), { status: 413, headers: corsHeaders });
  }
  if (notes && String(notes).length > MAX_FIELD_LEN) {
    return new Response(JSON.stringify({ error: "Notes too long" }), { status: 400, headers: corsHeaders });
  }

  const safe = {
    to:             escapeHtml(to),
    vendor_name:    escapeHtml(vendor_name),
    vendor_email:   escapeHtml(vendor_email),
    vendor_address: escapeHtml(vendor_address),
    customer_name:  escapeHtml(customer_name),
    receipt_number: escapeHtml(receipt_number),
    notes:          escapeHtml(notes),
    currency:       /^[A-Z]{3}$/.test(currency ?? "") ? currency : "CAD",
  };

  const safePaymentUrl = (payment_url && /^https?:\/\//i.test(payment_url)) ? payment_url : null;
  const fmt = (n: unknown) => `$${parseFloat(String(n || 0)).toFixed(2)}`;
  const dateStr = date ? new Date(date).toLocaleDateString("en-CA") : "";

  const itemRows = ((line_items as Array<{ description: string; quantity: number; unit_price: number; total: number }>) ?? [])
    .map((li) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e8e6e1;">${escapeHtml(li.description)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8e6e1;text-align:right;">${escapeHtml(String(li.quantity))}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8e6e1;text-align:right;">${fmt(li.unit_price)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8e6e1;text-align:right;">${fmt(li.total)}</td>
      </tr>`).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:helvetica,arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#1e1c18;padding:20px 28px;">
      <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.1em;">RECEIPT</span>
      <span style="color:#b4afa5;font-size:11px;float:right;line-height:20px;">#${safe.receipt_number}</span>
    </div>
    <div style="padding:24px 28px 0;">
      <table width="100%" style="margin-bottom:20px;">
        <tr>
          <td style="vertical-align:top;">
            <div style="font-size:11px;color:#908e8a;margin-bottom:4px;">FROM</div>
            <div style="font-size:14px;font-weight:700;color:#1e1c18;">${safe.vendor_name}</div>
            ${safe.vendor_address ? `<div style="font-size:10px;color:#908e8a;margin-top:2px;">${safe.vendor_address}</div>` : ""}
            ${safe.vendor_email   ? `<div style="font-size:10px;color:#908e8a;">${safe.vendor_email}</div>` : ""}
          </td>
          <td style="vertical-align:top;text-align:right;">
            <div style="font-size:11px;color:#908e8a;margin-bottom:4px;">ISSUED TO</div>
            <div style="font-size:14px;font-weight:700;color:#1e1c18;">${safe.customer_name}</div>
          </td>
        </tr>
      </table>
      <div style="font-size:11px;color:#908e8a;margin-bottom:20px;">Date: ${dateStr} · Currency: ${safe.currency}</div>
    </div>
    <table width="100%" style="border-collapse:collapse;">
      <thead>
        <tr style="background:#f0ede8;">
          <th style="padding:8px 12px;text-align:left;font-size:10px;color:#908e8a;font-weight:600;">DESCRIPTION</th>
          <th style="padding:8px 12px;text-align:right;font-size:10px;color:#908e8a;font-weight:600;">QTY</th>
          <th style="padding:8px 12px;text-align:right;font-size:10px;color:#908e8a;font-weight:600;">PRICE</th>
          <th style="padding:8px 12px;text-align:right;font-size:10px;color:#908e8a;font-weight:600;">TOTAL</th>
        </tr>
      </thead>
      <tbody>${itemRows || `<tr><td colspan="4" style="padding:12px;color:#908e8a;font-size:12px;">No line items</td></tr>`}</tbody>
    </table>
    <div style="padding:20px 28px;">
      ${parseFloat(String(subtotal)) > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#908e8a;margin-bottom:6px;"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>` : ""}
      ${parseFloat(String(tax)) > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#908e8a;margin-bottom:10px;"><span>Tax</span><span>${fmt(tax)}</span></div>` : ""}
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#1e1c18;border-top:1px solid #e8e6e1;padding-top:12px;">
        <span>Total</span><span>${fmt(total)}</span>
      </div>
      ${safe.notes ? `<div style="margin-top:20px;font-size:11px;color:#908e8a;border-top:1px solid #e8e6e1;padding-top:16px;"><strong>Note:</strong> ${safe.notes}</div>` : ""}
      ${safePaymentUrl ? `<div style="text-align:center;margin-top:24px;"><a href="${safePaymentUrl}" style="display:inline-block;background:#1e1c18;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:13px;font-weight:600;">Pay Now</a></div>` : ""}
    </div>
    <div style="background:#f5f4f0;padding:10px 28px 6px;text-align:center;font-size:9px;color:#c4c0b8;">This is an automatically generated invoice. Invoice ID: #${safe.receipt_number}</div>
    <div style="background:#f5f4f0;padding:0 28px 16px;text-align:center;font-size:10px;color:#b4afa5;">Sent via <a href="https://invoiceprepper.com" style="color:#908e8a;text-decoration:none;font-weight:600;">InvoicePrepper</a></div>
  </div>
</body></html>`;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
    },
    body: JSON.stringify({
      from: isPro && profile?.business_name ? `${profile.business_name} <invoices@invoiceprepper.com>` : "InvoicePrepper <invoices@invoiceprepper.com>",
      to: safe.to,
      subject: is_reminder
        ? `Friendly reminder: Invoice #${safe.receipt_number} from ${safe.vendor_name || "your vendor"}`
        : `Invoice #${safe.receipt_number} from ${safe.vendor_name || "your vendor"}`,
      html,
      reply_to: "support@invoiceprepper.com",
      ...(pdf_base64 ? {
        attachments: [{
          filename: `invoice-${safe.receipt_number}.pdf`,
          content: pdf_base64,
        }]
      } : {}),
    }),
  });

  if (!resendRes.ok) {
    const resendError = await resendRes.json().catch(() => ({ message: "unknown" }));
    console.error("Resend error:", JSON.stringify(resendError));
    return new Response(JSON.stringify({ error: resendError?.message ?? "Failed to send invoice" }), { status: 500, headers: corsHeaders });
  }

  const ph = createPostHogClient();
  ph.capture({
    distinctId: user.id,
    event: "invoice sent",
    properties: {
      receipt_number: safe.receipt_number,
      is_reminder: !!is_reminder,
      has_pdf: !!pdf_base64,
      tier: profile?.tier ?? "free",
    },
  });
  await ph.shutdown();

  return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
});
