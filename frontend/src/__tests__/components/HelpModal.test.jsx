/*
  ══════════════════════════════════════════════════════════════════════════════
  COMPONENT TEST: HelpModal
  File: components/HelpModal.test.jsx
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  HelpModal has a unique minimize/restore interaction not found in other modals.
  If minimize breaks, the window body disappears permanently. The legal section
  only renders when onLegal is provided — if that wiring breaks, users can't
  reach Terms or Privacy from inside the app.

  WHAT WE VERIFY:
  ───────────────
  1.  Modal renders with "How it works" title
  2.  Body content visible by default
  3.  Minimize button hides body content
  4.  Restore button (after minimize) shows body content again
  5.  Close button calls onClose
  6.  Legal section shows when onLegal provided
  7.  Legal section hidden when onLegal not provided
  8.  Terms button calls onLegal("terms") and onClose
  9.  Privacy button calls onLegal("privacy") and onClose
  ══════════════════════════════════════════════════════════════════════════════
*/

import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import HelpModal from "../../features/profile/HelpModal";

describe("Dashboard", () => {

function renderModal(overrides = {}) {
  const props = {
    onClose: vi.fn(),
    isPro: false,
    onLegal: vi.fn(),
    ...overrides,
  };
  render(<HelpModal {...props} />);
  return props;
}

describe("HelpModal — content", () => {
  it("renders How it works title", () => {
    renderModal();
    expect(screen.getByText("How it works")).toBeInTheDocument();
  });

  it("body content is visible by default", () => {
    renderModal();
    expect(screen.getByText(/Getting started/i)).toBeInTheDocument();
  });
});

describe("HelpModal — minimize and restore", () => {
  it("minimize button hides body content", () => {
    renderModal();
    fireEvent.click(screen.getByTitle(/minimise/i));
    expect(screen.queryByText(/Getting started/i)).not.toBeInTheDocument();
  });

  it("restore button shows body content again", () => {
    renderModal();
    fireEvent.click(screen.getByTitle(/minimise/i)); // minimize
    fireEvent.click(screen.getByTitle(/restore/i));  // restore
    expect(screen.getByText(/Getting started/i)).toBeInTheDocument();
  });
});

describe("HelpModal — close", () => {
  it("close button calls onClose", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByTitle(/close/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("HelpModal — legal section", () => {
  it("legal section shown when onLegal provided", () => {
    renderModal({ onLegal: vi.fn() });
    expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
  });

  it("legal section hidden when onLegal not provided", () => {
    renderModal({ onLegal: undefined });
    expect(screen.queryByText(/Terms of Service/i)).not.toBeInTheDocument();
  });

  it("Terms button calls onLegal and onClose", () => {
    const { onLegal, onClose } = renderModal();
    fireEvent.click(screen.getByText(/Terms of Service/i));
    expect(onLegal).toHaveBeenCalledWith("terms");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Privacy button calls onLegal and onClose", () => {
    const { onLegal, onClose } = renderModal();
    fireEvent.click(screen.getByText(/Privacy Policy/i));
    expect(onLegal).toHaveBeenCalledWith("privacy");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});


}); // Dashboard