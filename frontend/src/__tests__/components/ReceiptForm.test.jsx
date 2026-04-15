/*
  ══════════════════════════════════════════════════════════════════════════════
  COMPONENT TEST: ReceiptForm — validation, line items, AI tier gate
  File: components/ReceiptForm.test.jsx
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  ReceiptForm is the core product. Submit validation, line item management,
  and AI tier gating are all here. If submit fires with empty fields, bad
  data reaches the database. If the AI input shows to free users, they get
  pro features without paying.

  WHAT WE VERIFY:
  ───────────────
  1.  Form renders with Issued By and Billed To fields
  2.  Submit blocked (alert) when vendor_name empty
  3.  Submit blocked (alert) when customer_name empty
  4.  Submit fires onSubmit when required fields filled
  5.  Line item description field is present
  6.  "+ Add Line Item" button adds a new row
  7.  AI text input visible for pro user (desktop)
  8.  AI text input visible for voice user (desktop)
  9.  AI section hidden for free user
  10. Close button calls onClose
  ══════════════════════════════════════════════════════════════════════════════
*/

import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ReceiptForm from "../../features/invoices/ReceiptForm";

describe("Dashboard", () => {

// Mock all external dependencies
vi.mock("../../api/profile", () => ({ saveProfile: vi.fn() }));
vi.mock("../../api/uploadLogo", () => ({ uploadLogo: vi.fn() }));
vi.mock("../../api/aiParse", () => ({
  parseText: vi.fn(),
  parseAudio: vi.fn(),
  mapParsedToForm: vi.fn(),
}));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

// Stub matchMedia — jsdom doesn't implement it
// Set pointer:fine = true so isDesktop=true and text input renders
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: query === "(pointer: fine)", // desktop = true
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

function renderForm(tier = "free", initialData = null) {
  const props = {
    onSubmit: vi.fn(),
    onClose: vi.fn(),
    initialData,
    profile: { tier, business_name: "" },
    userEmail: "test@example.com",
    onLogoUpdate: vi.fn(),
    onUpgradeClick: vi.fn(),
  };
  render(<ReceiptForm {...props} />);
  return props;
}

describe("ReceiptForm — renders", () => {
  it("renders Issued By field", () => {
    renderForm();
    expect(screen.getByPlaceholderText(/business name/i)).toBeInTheDocument();
  });

  it("renders Billed To field", () => {
    renderForm();
    expect(screen.getByPlaceholderText(/client name or company/i)).toBeInTheDocument();
  });

  it("close button calls onClose", () => {
    const { onClose } = renderForm();
    // The cancel/close button in the footer
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ReceiptForm — submit validation", () => {
  beforeEach(() => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  it("blocks submit and shows alert when vendor_name empty", () => {
    const { onSubmit } = renderForm();
    // Leave vendor_name empty, fill customer_name
    fireEvent.change(screen.getByPlaceholderText(/client name or company/i), { target: { value: "Alice" } });
    fireEvent.click(screen.getByRole("button", { name: /generate receipt|save changes/i }));
    expect(window.alert).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks submit when customer_name empty", () => {
    const { onSubmit } = renderForm();
    fireEvent.change(screen.getByPlaceholderText(/business name/i), { target: { value: "My Biz" } });
    // Leave customer_name empty
    fireEvent.click(screen.getByRole("button", { name: /generate receipt|save changes/i }));
    expect(window.alert).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit when both required fields are filled", () => {
    const { onSubmit } = renderForm();
    fireEvent.change(screen.getByPlaceholderText(/business name/i), { target: { value: "My Biz" } });
    fireEvent.change(screen.getByPlaceholderText(/client name or company/i), { target: { value: "Alice" } });
    fireEvent.click(screen.getByRole("button", { name: /generate receipt|save changes/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("ReceiptForm — line items", () => {
  it("renders at least one line item description field", () => {
    renderForm();
    expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument();
  });

  it("Add Line Item button adds a new row", () => {
    renderForm();
    const before = screen.getAllByPlaceholderText(/description/i).length;
    fireEvent.click(screen.getByRole("button", { name: /\+ add line item/i }));
    const after = screen.getAllByPlaceholderText(/description/i).length;
    expect(after).toBe(before + 1);
  });
});

describe("ReceiptForm — AI tier gate", () => {
  it("AI text input visible for pro user on desktop", () => {
    renderForm("pro");
    expect(screen.getByPlaceholderText(/invoice to john/i)).toBeInTheDocument();
  });

  it("AI text input visible for voice user on desktop", () => {
    renderForm("voice");
    expect(screen.getByPlaceholderText(/invoice to john/i)).toBeInTheDocument();
  });

  it("AI text input NOT visible for free user", () => {
    renderForm("free");
    expect(screen.queryByPlaceholderText(/invoice to john/i)).not.toBeInTheDocument();
  });
});


}); // Dashboard