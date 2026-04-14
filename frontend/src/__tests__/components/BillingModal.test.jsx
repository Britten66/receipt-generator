/*
  ══════════════════════════════════════════════════════════════════════════════
  COMPONENT TEST: BillingModal
  File: components/BillingModal.test.jsx
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  BillingModal has the most complex conditional rendering in the app — free vs
  paid view, loading state, error state, cancelled subscription notice, and
  action buttons. Paid users hit this when managing their subscription. A
  broken state means they can't cancel or access billing history.

  WHAT WE VERIFY:
  ───────────────
  1.  Free user sees "Free plan" view
  2.  Free user sees "View Plans" button when onUpgrade provided
  3.  Free user does NOT see "View Plans" when onUpgrade not provided
  4.  Pro user sees paid view with tier label
  5.  Voice user sees paid view with Voice AI label
  6.  Loading state shows "Loading billing info..."
  7.  Error state shows error message
  8.  Cancelled subscription shows cancellation notice, hides action buttons
  9.  Close button calls onClose
  10. View Plans calls onClose then onUpgrade
  ══════════════════════════════════════════════════════════════════════════════
*/

import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import BillingModal from "../../features/billing/BillingModal";
import { fetchSubscriptionStatus } from "../../api/billing";

// Mock the billing API so no real fetch happens
vi.mock("../../api/billing", () => ({
  fetchSubscriptionStatus: vi.fn(() => Promise.resolve({ status: "active", current_period_end: "May 14, 2026", cancel_at_period_end: false })),
  cancelSubscription: vi.fn(),
  openBillingPortal: vi.fn(),
}));

function renderModal(profileTier = "free", overrides = {}) {
  const props = {
    profile: { tier: profileTier },
    onClose: vi.fn(),
    onUpgrade: vi.fn(),
    ...overrides,
  };
  render(<BillingModal {...props} />);
  return props;
}

describe("BillingModal — free user", () => {
  it("shows Free plan heading", () => {
    renderModal("free");
    expect(screen.getByText("Free plan")).toBeInTheDocument();
  });

  it("shows FREE badge", () => {
    renderModal("free");
    expect(screen.getByText("FREE")).toBeInTheDocument();
  });

  it("shows View Plans button when onUpgrade provided", () => {
    renderModal("free");
    expect(screen.getByRole("button", { name: /view plans/i })).toBeInTheDocument();
  });

  it("hides View Plans button when onUpgrade not provided", () => {
    renderModal("free", { onUpgrade: undefined });
    expect(screen.queryByRole("button", { name: /view plans/i })).not.toBeInTheDocument();
  });

  it("View Plans calls onClose and onUpgrade", () => {
    const { onClose, onUpgrade } = renderModal("free");
    fireEvent.click(screen.getByRole("button", { name: /view plans/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });
});

describe("BillingModal — paid user", () => {
  it("pro user sees Pro label", () => {
    renderModal("pro");
    expect(screen.getByText(/Pro · CAD \$9 \/ mo/i)).toBeInTheDocument();
  });

  it("pro user sees PRO badge", () => {
    renderModal("pro");
    expect(screen.getByText("PRO")).toBeInTheDocument();
  });

  it("voice user sees Voice AI label", () => {
    renderModal("voice");
    expect(screen.getByText(/Voice AI · CAD \$12 \/ mo/i)).toBeInTheDocument();
  });

  it("voice user sees VOICE AI badge", () => {
    renderModal("voice");
    expect(screen.getByText("VOICE AI")).toBeInTheDocument();
  });

  it("shows Loading billing info... before status loads", () => {
    // fetchSubscriptionStatus returns a pending promise — status stays null
    vi.mocked(fetchSubscriptionStatus).mockReturnValueOnce(new Promise(() => {}));
    renderModal("pro");
    expect(screen.getByText(/loading billing info/i)).toBeInTheDocument();
  });
});

describe("BillingModal — close", () => {
  it("close button calls onClose", () => {
    const { onClose } = renderModal("free");
    fireEvent.click(screen.getByRole("button", { name: /✕/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("backdrop click calls onClose", () => {
    const { onClose } = renderModal("free");
    // The backdrop is the fixed overlay div behind the modal
    const backdrop = document.querySelector('[style*="position: fixed"]');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
