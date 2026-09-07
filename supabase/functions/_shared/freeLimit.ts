// Shared between receipts/index.ts (enforcement) and profile/index.ts (usage
// display) so the two can't drift on who the free-invoice cap actually applies
// to. The DB trigger in supabase/migrations/018_free_invoice_limit.sql
// duplicates this logic in SQL (can't share JS across the boundary) and must
// be kept in sync by hand if this changes.

export interface FreeLimitProfile {
  tier?: string | null;
  legacy_unlimited_invoices?: boolean | null;
  pro_grant_until?: string | null;
}

// A profile is exempt from the free-invoice cap if it's grandfathered, has an
// active temporary Pro grant (referral reward), or is already a paying tier.
// Without the grant check here, a referred user who sees themselves as Pro
// everywhere else in the app (GET /profile overlays tier via applyGrantToTier)
// would still get capped and blocked on their 4th invoice this month.
export function isSubjectToFreeLimit(profile: FreeLimitProfile | null | undefined): boolean {
  if (!profile) return true;
  if (profile.legacy_unlimited_invoices) return false;
  const grantActive = !!profile.pro_grant_until && new Date(profile.pro_grant_until).getTime() > Date.now();
  if (grantActive) return false;
  return (profile.tier ?? "free") === "free";
}

// Start of the current UTC calendar month, as an ISO string, for the
// created_at >= cutoff query both files run.
export function startOfCurrentMonthISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
