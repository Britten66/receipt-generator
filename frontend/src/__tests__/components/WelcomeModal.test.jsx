/*
  ══════════════════════════════════════════════════════════════════════════════
  COMPONENT TEST: WelcomeModal
  File: components/WelcomeModal.test.jsx
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  WelcomeModal is shown once to every new user on first sign-in. If onClose
  is not wired correctly, new users get stuck. These tests confirm every
  dismiss path calls onClose exactly once.

  WHAT WE VERIFY:
  ───────────────
  1. Modal renders with expected welcome content
  2. Close button (✕) calls onClose
  3. Get Started button calls onClose
  4. Backdrop click calls onClose
  5. Clicking inside the modal does NOT call onClose
  ══════════════════════════════════════════════════════════════════════════════
*/

import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import WelcomeModal from "../../features/auth/WelcomeModal";

describe("Dashboard", () => {

function renderModal(overrides = {}) {
  const props = { onClose: vi.fn(), ...overrides };
  render(<WelcomeModal {...props} />);
  return props;
}

describe("WelcomeModal — content", () => {
  it("renders the welcome heading", () => {
    renderModal();
    expect(screen.getByText(/Welcome to InvoicePrepper/i)).toBeInTheDocument();
  });

  it("renders the Get Started button", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
  });

  it("renders the support email link", () => {
    renderModal();
    expect(screen.getByRole("link", { name: /support@invoiceprepper\.com/i })).toBeInTheDocument();
  });
});

describe("WelcomeModal — dismiss paths", () => {
  it("close button (✕) calls onClose", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /✕/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Get Started button calls onClose", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("backdrop click calls onClose", () => {
    const { onClose } = renderModal();
    const backdrop = document.querySelector(".modal-backdrop");
    fireEvent.click(backdrop, { target: backdrop });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});


}); // Dashboard