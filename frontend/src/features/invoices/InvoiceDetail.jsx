import { QRCodeSVG } from "qrcode.react";
import posthog from "posthog-js";
import { STATUS_CONFIG, fmt } from "../../lib/constants";
import { useSendInvoice } from "./useSendInvoice";

export default function InvoiceDetail({
  selectedReceipt, profile,
  setSelected, openEditReceipt, handleDelete, handleStatusChange,
  setPdfPreviewUrl, showToast,
}) {
  const {
    sendInvoiceTarget, setSendInvoiceTarget,
    sendInvoiceEmail, setSendInvoiceEmail,
    sendingInvoice,
    sendInvoiceConfirming, setSendInvoiceConfirming,
    handleSendInvoice,
  } = useSendInvoice({ profile, handleStatusChange, showToast });
  if (!selectedReceipt) return null;

  return (
    <div className="detail-panel">

      {/* Header: edit / delete / close */}
      <div className="detail-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-ghost" style={{ border: "1px solid var(--border)" }} onClick={() => openEditReceipt(selectedReceipt)}>✎ Edit</button>
            <button className="btn btn-danger" style={{ padding: "0 12px" }} onClick={() => handleDelete(selectedReceipt.id)}>✕ Delete</button>
          </div>
          <button onClick={() => setSelected(null)} className="btn-icon close-btn">✕</button>
        </div>
      </div>

      {/* Invoice document preview */}
      <div style={{ padding: "12px 14px 4px" }}>
        <div className="inv-doc">

          <div className="inv-doc-head">
            <span className="inv-doc-title">INVOICE</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", marginBottom: 2 }}>NO.</div>
              <div style={{ fontSize: 11, color: "#fff", fontFamily: "var(--mono)", fontWeight: 600, letterSpacing: "0.06em" }}>
                {selectedReceipt.receipt_number}
              </div>
            </div>
          </div>

          <div className="inv-doc-parties">
            <div className="inv-doc-party">
              <div className="inv-party-label">FROM</div>
              <div className="inv-party-name">{selectedReceipt.vendor_name}</div>
            </div>
            <div className="inv-doc-party">
              <div className="inv-party-label">BILLED TO</div>
              <div className="inv-party-name">{selectedReceipt.customer_name}</div>
            </div>
            <div className="inv-doc-party" style={{ textAlign: "right" }}>
              <div className="inv-party-label">DATE</div>
              <div className="inv-party-name" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                {selectedReceipt.date ? new Date(selectedReceipt.date).toLocaleDateString("en-CA") : "—"}
              </div>
              <span className={`stamp ${selectedReceipt.status}`} style={{ marginTop: 6 }}>
                {selectedReceipt.status}
              </span>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "0 14px" }} />

          <div style={{ padding: "10px 14px 0" }}>
            <table className="line-items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Unit</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedReceipt.line_items?.length ? (
                  selectedReceipt.line_items.map((li) => (
                    <tr key={li.id}>
                      <td>{li.description}</td>
                      <td className="number">{li.quantity}</td>
                      <td className="number">{fmt(li.unit_price)}</td>
                      <td className="number">{fmt(li.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--text-muted)", paddingTop: 10, fontSize: 9, letterSpacing: "0.15em" }}>
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: "8px 14px 14px", borderTop: "1px solid var(--border-light)", marginTop: 4 }}>
            {parseFloat(selectedReceipt.subtotal || 0) > 0 && (
              <div className="total-line">
                <span className="tl-label">Subtotal</span>
                <span className="tl-val">{fmt(selectedReceipt.subtotal)}</span>
              </div>
            )}
            {parseFloat(selectedReceipt.tax || 0) > 0 && (
              <div className="total-line">
                <span className="tl-label">Tax</span>
                <span className="tl-val">{fmt(selectedReceipt.tax)}</span>
              </div>
            )}
            <div className="total-line grand">
              <span className="tl-label">Total</span>
              <span className="tl-val">{fmt(selectedReceipt.total)}</span>
            </div>
          </div>

          {selectedReceipt.notes && (
            <div style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 5 }}>Notes</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.55 }}>{selectedReceipt.notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Status change */}
      <div className="detail-section">
        <div className="stat-label" style={{ marginBottom: 8 }}>Update Status</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {Object.keys(STATUS_CONFIG)
            .filter((s) => s !== selectedReceipt.status)
            .map((s) => (
              <button key={s} className="btn btn-status" onClick={() => handleStatusChange(selectedReceipt.id, s)}>
                {s}
              </button>
            ))}
        </div>
      </div>

      {/* QR code */}
      {profile?.payment_url && !["paid", "voided"].includes(selectedReceipt.status) && (
        <div className="detail-section" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "16px 14px" }}>
          <QRCodeSVG value={profile.payment_url} size={130} bgColor="#ffffff" fgColor="#111110" level="M" />
          <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", letterSpacing: "0.05em" }}>
            Scan to pay · {fmt(selectedReceipt.total)}
          </div>
        </div>
      )}

      {/* PDF actions */}
      <div className="detail-section">

        {"share" in navigator && (profile?.tier === "pro" || profile?.tier === "voice") && (
          <button
            className="btn btn-ghost"
            style={{ width: "100%", marginBottom: 6 }}
            onClick={async () => {
              try {
                const { shareReceiptPDF } = await import("./ReceiptPDF");
                await shareReceiptPDF({ ...selectedReceipt, logo_url: selectedReceipt.logo_url || profile?.logo_url, tier: profile?.tier });
              } catch (err) {
                if (err?.name !== "AbortError") console.error("Share failed:", err);
              }
            }}
          >
            Share Invoice
          </button>
        )}

        <button
          className="btn btn-ghost"
          style={{ width: "100%", marginBottom: 6 }}
          onClick={async () => {
            const isIOS   = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
            const isMobile = window.innerWidth <= 768;
            const win = (!isIOS && !isMobile) ? window.open("", "_blank") : null;
            const { downloadReceiptPDF, getPDFBlobUrl } = await import("./ReceiptPDF");
            const receiptData = { ...selectedReceipt, logo_url: selectedReceipt.logo_url || profile?.logo_url, tier: profile?.tier };
            if (isIOS) {
              if (win) win.close();
              downloadReceiptPDF(receiptData);
            } else if (isMobile) {
              const url = await getPDFBlobUrl(receiptData);
              setPdfPreviewUrl(url);
            } else {
              const url = await getPDFBlobUrl(receiptData);
              if (win) {
                const title = `Invoice ${receiptData.receipt_number || ""}`.trim();
                win.document.open();
                win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="margin:0;padding:0;height:100vh;overflow:hidden;"><embed src="${url}" type="application/pdf" width="100%" height="100%"></body></html>`);
                win.document.close();
              } else {
                downloadReceiptPDF(receiptData);
              }
            }
          }}
        >
          Preview PDF
        </button>

        <button
          className="btn btn-download"
          style={{ width: "100%", marginBottom: 6 }}
          onClick={async () => {
            const { downloadReceiptPDF } = await import("./ReceiptPDF");
            downloadReceiptPDF({ ...selectedReceipt, logo_url: selectedReceipt.logo_url || profile?.logo_url, tier: profile?.tier });
            posthog.capture("pdf_downloaded", { invoice_status: selectedReceipt.status, tier: profile?.tier ?? "free" });
          }}
        >
          Download PDF
        </button>

        {(profile?.tier === "pro" || profile?.tier === "voice") && selectedReceipt.status === "sent" && (
          <div style={{ marginTop: 6 }}>
            <button
              className="btn btn-ghost"
              style={{ width: "100%" }}
              onClick={() => {
                setSendInvoiceTarget({ ...selectedReceipt, _isReminder: true });
                setSendInvoiceEmail(selectedReceipt.customer_email || "");
              }}
            >
              &#8635; Send Reminder
            </button>
          </div>
        )}

        <div style={{ marginTop: 6, borderTop: "1px solid var(--border-light)", paddingTop: 10 }}>
          {sendInvoiceTarget?.id === selectedReceipt.id ? (
            <div>
              {sendInvoiceConfirming ? (
                <div>
                  <p style={{ fontSize: 12, color: "var(--text)", marginBottom: 10, lineHeight: 1.5 }}>
                    Send invoice to <strong>{sendInvoiceEmail}</strong>? Are you ready to send?
                  </p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setSendInvoiceConfirming(false)}>Go Back</button>
                    <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSendInvoice} disabled={sendingInvoice}>
                      {sendingInvoice ? "Sending..." : "Yes, Send"}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    className="field"
                    type="email"
                    placeholder="Client email address"
                    autoFocus
                    value={sendInvoiceEmail}
                    onChange={(e) => setSendInvoiceEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendInvoiceEmail && setSendInvoiceConfirming(true)}
                    style={{ marginBottom: 6 }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setSendInvoiceTarget(null); setSendInvoiceEmail(""); setSendInvoiceConfirming(false); }}>Cancel</button>
                    <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => sendInvoiceEmail && setSendInvoiceConfirming(true)} disabled={!sendInvoiceEmail}>
                      Send Invoice
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            (profile?.tier === "pro" || profile?.tier === "voice") && (
              <button
                className="btn btn-ghost"
                style={{ width: "100%" }}
                onClick={() => {
                  setSendInvoiceTarget(selectedReceipt);
                  setSendInvoiceEmail("");
                }}
              >
                ✉ Send to Client
              </button>
            )
          )}
        </div>
      </div>

    </div>
  );
}
