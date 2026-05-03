import { useEffect, useMemo, useState } from "react";
import { fetchReferralInfo } from "../../api/referrals";

// Build a flat list of notification items from existing data sources.
// No new schema. Receipts give us status events. Profile gives us grant state.
// Referral info gives us friend count.
export function useNotifications({ receipts, profile }) {
  const [referral, setReferral] = useState(null);

  useEffect(() => {
    fetchReferralInfo()
      .then((r) => { if (!r?.error) setReferral(r); })
      .catch(() => {});
  }, []);

  const stripeTier = profile?.stripe_tier ?? profile?.tier ?? "free";
  const effectiveTier = profile?.tier ?? "free";
  const isPaid = effectiveTier === "pro" || effectiveTier === "voice";
  const showPromo = stripeTier === "free" && !!referral?.code;

  // Upcoming due dates. Pulled from receipts.due_by, only for unpaid invoices.
  // Surfaces anything within the next 7 days, plus anything overdue.
  const reminders = useMemo(() => {
    const now = Date.now();
    const horizon = now + 7 * 86400000;
    const out = [];

    for (const r of (receipts || [])) {
      if (!r.due_by) continue;
      if (r.status === "paid" || r.status === "voided") continue;
      // Compare to end of due day so "today" feels right
      const due = new Date(r.due_by + "T23:59:59");
      const ts = due.getTime();
      if (ts <= horizon || ts < now) {
        out.push({
          id: `due-${r.id}`,
          kind: "due",
          status: r.status,
          title: `${r.receipt_number || "Invoice"} due`,
          subtitle: ts < now ? "overdue" : reminderRelative(ts),
          timestamp: r.due_by,
          ts,
        });
      }
    }

    return out.sort((a, b) => a.ts - b.ts).slice(0, 8);
  }, [receipts]);

  const items = useMemo(() => {
    const out = [];

    // Friend signed up via your code (only fires after a real referral lands).
    if (referral?.friends_referred && referral.friends_referred > 0) {
      out.push({
        id: "friends",
        kind: "friends",
        title: `${referral.friends_referred} friend${referral.friends_referred === 1 ? "" : "s"} joined`,
        subtitle: "Through your referral code",
      });
    }

    // Recent invoice activity. Last 3, sorted by created_at desc.
    const sorted = [...(receipts || [])].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    );
    for (const r of sorted.slice(0, 3)) {
      out.push({
        id: `inv-${r.id}`,
        kind: "invoice",
        status: r.status,
        title: invoiceTitle(r),
        subtitle: relativeTime(r.created_at),
        timestamp: r.created_at,
      });
    }

    return out;
  }, [receipts, profile, referral]);

  const SEEN_KEY = "notif_last_seen";
  const [lastSeen, setLastSeen] = useState(() => parseInt(localStorage.getItem(SEEN_KEY) || "0", 10));

  function markSeen() {
    const now = Date.now();
    localStorage.setItem(SEEN_KEY, String(now));
    setLastSeen(now);
  }

  const unreadCount = useMemo(() => {
    return items.filter((i) => i.timestamp && new Date(i.timestamp).getTime() > lastSeen).length;
  }, [items, lastSeen]);

  return { items, unreadCount, showPromo, referral, reminders, isPaid, markSeen };
}

function reminderRelative(ts) {
  const diff = ts - Date.now();
  const days = Math.round(diff / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function invoiceTitle(r) {
  const num = r.receipt_number || "Invoice";
  if (r.status === "paid") return `${num} marked paid`;
  if (r.status === "sent") return `${num} sent`;
  if (r.status === "voided") return `${num} voided`;
  return `${num} created`;
}

function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} d ago`;
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}
