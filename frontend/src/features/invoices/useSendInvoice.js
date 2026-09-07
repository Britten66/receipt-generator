import { useState } from "react";
import { supabase } from "../../lib/supabase";
import posthog from "posthog-js";

export function useSendInvoice({ profile, handleStatusChange, showToast }) {
  const [sendInvoiceTarget, setSendInvoiceTarget]         = useState(null);
  const [sendInvoiceEmail, setSendInvoiceEmail]           = useState("");
  const [sendingInvoice, setSendingInvoice]               = useState(false);
  const [sendInvoiceConfirming, setSendInvoiceConfirming] = useState(false);

  async function handleSendInvoice() {
    if (!sendInvoiceEmail) return;
    setSendInvoiceConfirming(false);
    setSendingInvoice(true);
    try {
      const r = sendInvoiceTarget;
      const { buildPDFBase64 } = await import("./ReceiptPDF");
      const pdfBase64 = await buildPDFBase64({
        ...r,
        logo_url:       r.logo_url || profile?.logo_url || null,
        logo_corner:    r.logo_corner || null,
        tier:           profile?.tier ?? "free",
        vendor_address: profile?.address  || "",
        vendor_phone:   profile?.phone    || "",
        vendor_email:   profile?.email    || "",
        vendor_website: profile?.website  || "",
      });
      const { data: { session: _s } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${_s?.access_token ?? ""}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          to:          sendInvoiceEmail,
          receipt_id:  r.id,
          pdf_base64:  pdfBase64,
          is_reminder: !!r._isReminder,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? "Send failed"); }
      if (r.status === "draft") {
        const { updateReceipt } = await import("../../api/receipts");
        await updateReceipt(r.id, { status: "sent" });
        handleStatusChange(r.id, "sent");
      }
      posthog.capture("invoice_sent", {
        is_reminder: !!r._isReminder,
        invoice_status_before: r.status,
        tier: profile?.tier ?? "free",
      });
      showToast(`Invoice sent to ${sendInvoiceEmail}.`, "success");
      setSendInvoiceTarget(null);
      setSendInvoiceEmail("");
    } catch (err) {
      showToast(err.message || "Failed to send invoice.");
    }
    setSendingInvoice(false);
  }

  return {
    sendInvoiceTarget, setSendInvoiceTarget,
    sendInvoiceEmail, setSendInvoiceEmail,
    sendingInvoice,
    sendInvoiceConfirming, setSendInvoiceConfirming,
    handleSendInvoice,
  };
}
