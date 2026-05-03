import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, CheckCircle2, Send, FileText, Ban, Gift, UserPlus, Sparkles, CalendarClock } from "lucide-react";
import { useNotifications } from "./useNotifications";
import { trackReferralCopied } from "../../api/referrals";
import "./NotificationsBell.css";

export default function NotificationsBell({ receipts, profile }) {
  const { items, unreadCount, showPromo, referral, reminders, isPaid, markSeen } = useNotifications({ receipts, profile });
  const [copied, setCopied] = useState(false);
  const hasNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function handleShare() {
    if (!referral?.code) return;
    const text = `Try InvoicePrepper. Use my code ${referral.code} and you get 1 month of Pro free. ${referral.share_url}`;
    if (hasNativeShare) {
      try {
        await navigator.share({ title: "InvoicePrepper", text, url: referral.share_url });
        trackReferralCopied(referral.code);
      } catch { /* user cancelled, do nothing */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(referral.share_url);
      setCopied(true);
      trackReferralCopied(referral.code);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  }

  return (
    <DropdownMenu.Root onOpenChange={(open) => { if (open) markSeen(); }}>
      <DropdownMenu.Trigger asChild>
        <button className="notif-bell" aria-label="Notifications">
          <Bell size={18} strokeWidth={1.75} />
          {unreadCount > 0 && <span className="notif-dot" aria-label={`${unreadCount} new`} />}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="notif-panel" sideOffset={10} align="end" collisionPadding={12} avoidCollisions>
          {showPromo && (
            <div className="notif-promo">
              <div className="notif-promo-head">
                <Sparkles size={14} strokeWidth={1.75} />
                <span>Outreach Promo</span>
              </div>
              <div className="notif-promo-title">Give the gift of Pro</div>
              <div className="notif-promo-sub">A friend signs up, makes an invoice, and you both get a month of Pro free.</div>
              <div className="notif-promo-row">
                <code className="notif-promo-code">{referral?.code}</code>
                <button className="notif-promo-share" onClick={handleShare}>
                  {copied ? "Copied" : hasNativeShare ? "Share" : "Copy link"}
                </button>
              </div>
            </div>
          )}

          {reminders.length > 0 && (
            <>
              <div className="notif-section-h">Due dates</div>
              <ul className="notif-list">
                {reminders.map((it) => (
                  <li key={it.id} className="notif-item">
                    <span className={`notif-icon notif-icon-due${it.subtitle === "overdue" ? " notif-icon-overdue" : ""}`}>
                      <CalendarClock size={14} strokeWidth={1.75} />
                    </span>
                    <div className="notif-text">
                      <div className="notif-title">{it.title}</div>
                      <div className="notif-sub">{it.subtitle}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="notif-section-h">Activity</div>

          {items.length === 0 ? (
            <div className="notif-empty">No activity yet. Create your first invoice to see it here.</div>
          ) : (
            <ul className="notif-list">
              {items.map((it) => (
                <li key={it.id} className="notif-item">
                  <span className={`notif-icon notif-icon-${it.kind}${it.status ? ` notif-icon-${it.status}` : ""}`}>
                    <ItemIcon item={it} />
                  </span>
                  <div className="notif-text">
                    <div className="notif-title">{it.title}</div>
                    {it.subtitle && <div className="notif-sub">{it.subtitle}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ItemIcon({ item }) {
  const size = 14;
  const sw = 1.75;
  if (item.kind === "grant")   return <Gift size={size} strokeWidth={sw} />;
  if (item.kind === "friends") return <UserPlus size={size} strokeWidth={sw} />;
  if (item.kind === "invoice") {
    if (item.status === "paid")   return <CheckCircle2 size={size} strokeWidth={sw} />;
    if (item.status === "sent")   return <Send size={size} strokeWidth={sw} />;
    if (item.status === "voided") return <Ban size={size} strokeWidth={sw} />;
    return <FileText size={size} strokeWidth={sw} />;
  }
  return <FileText size={size} strokeWidth={sw} />;
}
