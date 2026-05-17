export const STATUS_CONFIG = {
  draft:  { label: "Draft" },
  sent:   { label: "Sent" },
  paid:   { label: "Paid" },
  voided: { label: "Voided" },
};

export const NAV = [
  { key: "ALL",    label: "All" },
  { key: "draft",  label: "Draft" },
  { key: "sent",   label: "Sent" },
  { key: "paid",   label: "Paid" },
  { key: "voided", label: "Voided" },
];

export const STATUS_LABELS = {
  draft:  "Saved as draft",
  sent:   "Marked as sent",
  paid:   "Marked as paid",
  voided: "Invoice voided",
};

// "$1,234.56": used on cards and in the detail panel totals block
export function fmt(n) {
  return "$" + parseFloat(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Compact format for sidebar stat values: avoids overflow in narrow columns
export function fmtStat(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// "Apr 18" short date. Anchors YYYY-MM-DD at local midnight so the day does not slip in negative UTC offsets.
export function fmtDate(d) {
  if (!d) return "";
  const safe = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d + "T00:00:00" : d;
  const dt = new Date(safe);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
