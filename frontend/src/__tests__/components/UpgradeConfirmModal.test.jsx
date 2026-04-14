/*
  ══════════════════════════════════════════════════════════════════════════════
  COMPONENT TEST: UpgradeConfirmModal
  File: components/UpgradeConfirmModal.test.jsx
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  This modal gates every Stripe checkout. If the Continue button fires without
  the checkbox checked, users could be sent to checkout without agreeing to
  recurring billing terms — a legal and UX problem. These tests lock the
  consent gate and all callback wiring.

  WHAT WE VERIFY:
  ───────────────
  1.  Shows "Pro" copy and $9.00 when targetTier="pro"
  2.  Shows "Voice AI" copy and $12.00 when targetTier="voice"
  3.  Continue button is disabled when agreed=false
  4.  Continue button is enabled when agreed=true
  5.  Error hint shows when agreed=false
  6.  Error hint hidden when agreed=true
  7.  Checkbox change calls onAgreeChange
  8.  Continue button calls onConfirm when agreed
  9.  Cancel button calls onClose
  10. Terms link calls onOpenLegal("terms")
  11. Privacy link calls onOpenLegal("privacy")
  12. Backdrop click calls onClose
  ══════════════════════════════════════════════════════════════════════════════
*/

import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import UpgradeConfirmModal from "../../features/billing/UpgradeConfirmModal";

function renderModal({ tier = "pro", agreed = false } = {}) {
  const props = {
    targetTier: tier,
    agreed,
    onAgreeChange: vi.fn(),
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    onOpenLegal: vi.fn(),
  };
  render(<UpgradeConfirmModal {...props} />);
  return props;
}

describe("UpgradeConfirmModal — Pro tier copy", () => {
  it("shows 'Upgrade to Pro' in header", () => {
    renderModal({ tier: "pro" });
    expect(screen.getByText(/Upgrade to Pro/i)).toBeInTheDocument();
  });

  it("shows $9.00 price", () => {
    renderModal({ tier: "pro" });
    expect(screen.getAllByText(/\$9\.00/).length).toBeGreaterThan(0);
  });
});

describe("UpgradeConfirmModal — Voice AI tier copy", () => {
  it("shows 'Upgrade to Voice AI' in header", () => {
    renderModal({ tier: "voice" });
    expect(screen.getByText(/Upgrade to Voice AI/i)).toBeInTheDocument();
  });

  it("shows $12.00 price", () => {
    renderModal({ tier: "voice" });
    expect(screen.getAllByText(/\$12\.00/).length).toBeGreaterThan(0);
  });
});

describe("UpgradeConfirmModal — consent gate", () => {
  it("Continue button is disabled when not agreed", () => {
    renderModal({ agreed: false });
    expect(screen.getByRole("button", { name: /continue to payment/i })).toBeDisabled();
  });

  it("Continue button is enabled when agreed", () => {
    renderModal({ agreed: true });
    expect(screen.getByRole("button", { name: /continue to payment/i })).not.toBeDisabled();
  });

  it("shows must-check hint when not agreed", () => {
    renderModal({ agreed: false });
    expect(screen.getByText(/you must check the box/i)).toBeInTheDocument();
  });

  it("hides must-check hint when agreed", () => {
    renderModal({ agreed: true });
    expect(screen.queryByText(/you must check the box/i)).not.toBeInTheDocument();
  });
});

describe("UpgradeConfirmModal — callbacks", () => {
  it("checkbox change calls onAgreeChange", () => {
    const { onAgreeChange } = renderModal({ agreed: false });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onAgreeChange).toHaveBeenCalledTimes(1);
  });

  it("Continue button calls onConfirm when agreed", () => {
    const { onConfirm } = renderModal({ agreed: true });
    fireEvent.click(screen.getByRole("button", { name: /continue to payment/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("Cancel button calls onClose", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Terms link calls onOpenLegal with 'terms'", () => {
    const { onOpenLegal } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /terms of service/i }));
    expect(onOpenLegal).toHaveBeenCalledWith("terms");
  });

  it("Privacy link calls onOpenLegal with 'privacy'", () => {
    const { onOpenLegal } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /privacy policy/i }));
    expect(onOpenLegal).toHaveBeenCalledWith("privacy");
  });

  it("backdrop click calls onClose", () => {
    const { onClose } = renderModal();
    const backdrop = document.querySelector(".modal-backdrop");
    fireEvent.click(backdrop, { target: backdrop });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
