/*
  ══════════════════════════════════════════════════════════════════════════════
  COMPONENT TEST: PlansModal
  File: components/PlansModal.test.jsx
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  PlansModal is the main upgrade conversion surface. If the Pro card shows
  to pro users, or the wrong price displays, or a button is wired to the
  wrong handler, real upgrade revenue is affected. These tests lock the
  exact conditional rendering and callback wiring.

  WHAT WE VERIFY:
  ───────────────
  1.  Free user sees both Pro and Voice AI cards
  2.  Pro user sees only Voice AI card (Pro card hidden)
  3.  Title is "Choose your plan" for free users
  4.  Title is "Upgrade to Voice AI" for pro users
  5.  CAD pricing shown by default
  6.  USD pricing shown when currency="USD"
  7.  "Get Pro" button calls onSelectPro
  8.  "Get Voice AI" button calls onSelectVoice
  9.  Close button calls onClose
  10. Backdrop click calls onClose
  ══════════════════════════════════════════════════════════════════════════════
*/

import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import PlansModal from "../../features/billing/PlansModal";

describe("Billing", () => {

// BorderGlow uses canvas/WebGL: stub it out so jsdom doesn't crash
vi.mock("../../layout/BorderGlow", () => ({
  default: ({ children }) => <div data-testid="border-glow">{children}</div>,
}));

const baseProps = {
  darkMode: false,
  currency: "CAD",
  onClose: vi.fn(),
  onSelectPro: vi.fn(),
  onSelectVoice: vi.fn(),
};

function renderModal(profileTier = "free", currencyOverride = "CAD") {
  const props = {
    ...baseProps,
    onClose: vi.fn(),
    onSelectPro: vi.fn(),
    onSelectVoice: vi.fn(),
    profile: { tier: profileTier },
    currency: currencyOverride,
  };
  render(<PlansModal {...props} />);
  return props;
}

describe("PlansModal: free user view", () => {
  it("shows both Pro and Voice AI cards", () => {
    renderModal("free");
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Voice AI")).toBeInTheDocument();
  });

  it("title is 'Choose your plan'", () => {
    renderModal("free");
    expect(screen.getByText("Choose your plan")).toBeInTheDocument();
  });

  it("shows Get Pro button", () => {
    renderModal("free");
    expect(screen.getByRole("button", { name: /get pro/i })).toBeInTheDocument();
  });

  it("shows Get Voice AI button", () => {
    renderModal("free");
    expect(screen.getByRole("button", { name: /get voice ai/i })).toBeInTheDocument();
  });
});

describe("PlansModal: pro user view", () => {
  it("hides the Pro card for pro users", () => {
    renderModal("pro");
    expect(screen.queryByRole("button", { name: /get pro/i })).not.toBeInTheDocument();
  });

  it("still shows the Voice AI card", () => {
    renderModal("pro");
    expect(screen.getByText("Voice AI")).toBeInTheDocument();
  });

  it("title is 'Upgrade to Voice AI'", () => {
    renderModal("pro");
    expect(screen.getByText("Upgrade to Voice AI")).toBeInTheDocument();
  });
});

describe("PlansModal: pricing", () => {
  /*
    Subscriptions are billed in CAD by Stripe regardless of the user's
    invoice-currency preference, so the modal now always shows the CAD
    price with a "Billed in CAD" footnote. The old behaviour displayed
    misleading labels like "INR $9" when an India user opened the modal.
  */
  it("always shows CAD billing note regardless of selected invoice currency", () => {
    renderModal("free", "INR");
    expect(screen.getAllByText(/Billed in CAD/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/INR \$/)).toBeNull();
  });

  it("displays the Pro and Voice AI prices as plain dollar amounts", () => {
    renderModal("free", "CAD");
    expect(screen.getByText(/^\$9$/)).toBeInTheDocument();
    expect(screen.getByText(/^\$12$/)).toBeInTheDocument();
  });
});

describe("PlansModal: callbacks", () => {
  it("Get Pro button calls onSelectPro", () => {
    const { onSelectPro } = renderModal("free");
    fireEvent.click(screen.getByRole("button", { name: /get pro/i }));
    expect(onSelectPro).toHaveBeenCalledTimes(1);
  });

  it("Get Voice AI button calls onSelectVoice", () => {
    const { onSelectVoice } = renderModal("free");
    fireEvent.click(screen.getByRole("button", { name: /get voice ai/i }));
    expect(onSelectVoice).toHaveBeenCalledTimes(1);
  });

  it("close button calls onClose", () => {
    const { onClose } = renderModal("free");
    fireEvent.click(screen.getByRole("button", { name: /✕/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("backdrop click calls onClose", () => {
    const { onClose } = renderModal("free");
    const backdrop = document.querySelector(".modal-backdrop");
    fireEvent.click(backdrop, { target: backdrop });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});


}); // Billing