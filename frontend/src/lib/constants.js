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

/*
  Currency symbol lookup. Used by fmt() and the PDF generator so an INR
  invoice renders as "₹5,000.00" instead of "$5,000.00" or "INR 5000.00".
  Anything not in this map falls back to the ISO code + space, which is
  the safe generic format jsPDF needs when a unicode symbol is unsupported.
*/
export const CURRENCY_SYMBOLS = {
  USD: "$",
  CAD: "$",
  AUD: "A$",
  NZD: "NZ$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  CHF: "CHF ",
  MXN: "MX$",
  BRL: "R$",
  SEK: "kr ",
  NOK: "kr ",
  SGD: "S$",
};

export function currencySymbol(code) {
  if (!code) return "$";
  return CURRENCY_SYMBOLS[code] || (code + " ");
}

// "$1,234.56" / "₹5,000.00": used on cards and in the detail panel totals block.
// Pass the invoice's currency so the symbol matches what the customer was billed in.
export function fmt(n, currency) {
  return currencySymbol(currency) + parseFloat(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Compact format for sidebar stat values: avoids overflow in narrow columns.
// Stats aggregate across invoices that may be in different currencies, so the
// symbol here reflects the user's display preference (passed in) rather than
// any one invoice's currency.
export function fmtStat(n, currency) {
  const s = currencySymbol(currency);
  if (n >= 1_000_000) return `${s}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `${s}${(n / 1_000).toFixed(1)}K`;
  return `${s}${n.toFixed(2)}`;
}

// "Apr 18" short date. Anchors YYYY-MM-DD at local midnight so the day does not slip in negative UTC offsets.
export function fmtDate(d) {
  if (!d) return "";
  const safe = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d + "T00:00:00" : d;
  const dt = new Date(safe);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
