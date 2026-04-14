/*
  ══════════════════════════════════════════════════════════════════════════════
  COMPONENT TEST: InvoiceDetail — tier-gated buttons
  File: components/InvoiceDetail.test.jsx
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  Share Invoice and Send Invoice are Pro/Voice-only features. Send Reminder is
  Pro/Voice-only AND only shows on "sent" invoices. If the tier gate breaks,
  free users get pro features silently. These are the features you're selling —
  gating them correctly is critical.

  WHAT WE VERIFY:
  ───────────────
  1.  Returns null when no invoice selected
  2.  Share Invoice button visible for pro user (when navigator.share exists)
  3.  Share Invoice button NOT visible for free user
  4.  Send Invoice button visible for pro user
  5.  Send Invoice button NOT visible for free user
  6.  Send Reminder only shows for pro/voice AND status="sent"
  7.  Send Reminder hidden when status is not "sent"
  8.  Edit button calls openEditReceipt
  9.  Delete button calls handleDelete
  10. Close button calls setSelected(null)
  11. Status change buttons exclude current status
  12. Notes section only shows when invoice has notes
  ══════════════════════════════════════════════════════════════════════════════
*/

import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import InvoiceDetail from "../../features/invoices/InvoiceDetail";

// Mock posthog so no network calls happen
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

// Mock ReceiptPDF dynamic imports
vi.mock("../../features/invoices/ReceiptPDF", () => ({
  downloadReceiptPDF: vi.fn(),
  shareReceiptPDF: vi.fn(),
  getPDFBlobUrl: vi.fn(() => Promise.resolve("blob:test")),
}));

// Mock useSendInvoice hook
vi.mock("../../features/invoices/useSendInvoice", () => ({
  useSendInvoice: () => ({
    sendInvoiceTarget: null,
    setSendInvoiceTarget: vi.fn(),
    sendInvoiceEmail: "",
    setSendInvoiceEmail: vi.fn(),
    sendingInvoice: false,
    sendInvoiceConfirming: false,
    setSendInvoiceConfirming: vi.fn(),
    handleSendInvoice: vi.fn(),
  }),
}));

const MOCK_INVOICE = {
  id: "1",
  receipt_number: "INV-000001",
  vendor_name: "My Biz",
  customer_name: "Alice",
  date: "2026-04-14",
  status: "draft",
  subtotal: 100,
  tax: 13,
  total: 113,
  notes: "",
  line_items: [{ id: "li1", description: "Web Design", quantity: 1, unit_price: 100, total: 100 }],
};

function renderDetail(invoiceOverrides = {}, profileTier = "free") {
  const invoice = { ...MOCK_INVOICE, ...invoiceOverrides };
  const props = {
    selectedReceipt: invoice,
    profile: { tier: profileTier },
    setSelected: vi.fn(),
    openEditReceipt: vi.fn(),
    handleDelete: vi.fn(),
    handleStatusChange: vi.fn(),
    setPdfPreviewUrl: vi.fn(),
    showToast: vi.fn(),
  };
  render(<InvoiceDetail {...props} />);
  return props;
}

describe("InvoiceDetail — null state", () => {
  it("renders nothing when no invoice selected", () => {
    const { container } = render(
      <InvoiceDetail
        selectedReceipt={null}
        profile={{ tier: "free" }}
        setSelected={vi.fn()} openEditReceipt={vi.fn()} handleDelete={vi.fn()}
        handleStatusChange={vi.fn()} setPdfPreviewUrl={vi.fn()} showToast={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("InvoiceDetail — tier gates", () => {
  beforeEach(() => {
    // Simulate navigator.share being available
    Object.defineProperty(navigator, "share", { value: vi.fn(), configurable: true, writable: true });
  });

  afterEach(() => {
    delete navigator.share;
  });

  it("Share Invoice visible for pro user", () => {
    renderDetail({}, "pro");
    expect(screen.getByRole("button", { name: /share invoice/i })).toBeInTheDocument();
  });

  it("Share Invoice NOT visible for free user", () => {
    renderDetail({}, "free");
    expect(screen.queryByRole("button", { name: /share invoice/i })).not.toBeInTheDocument();
  });

  it("Send to Client button visible for pro user", () => {
    renderDetail({}, "pro");
    expect(screen.getByRole("button", { name: /send to client/i })).toBeInTheDocument();
  });

  it("Send to Client button NOT visible for free user", () => {
    renderDetail({}, "free");
    expect(screen.queryByRole("button", { name: /send to client/i })).not.toBeInTheDocument();
  });

  it("Send Reminder shows for pro user with sent status", () => {
    renderDetail({ status: "sent" }, "pro");
    expect(screen.getByRole("button", { name: /send reminder/i })).toBeInTheDocument();
  });

  it("Send Reminder hidden when status is draft even for pro", () => {
    renderDetail({ status: "draft" }, "pro");
    expect(screen.queryByRole("button", { name: /send reminder/i })).not.toBeInTheDocument();
  });

  it("Send Reminder hidden for free user even with sent status", () => {
    renderDetail({ status: "sent" }, "free");
    expect(screen.queryByRole("button", { name: /send reminder/i })).not.toBeInTheDocument();
  });
});

describe("InvoiceDetail — action buttons", () => {
  it("Edit button calls openEditReceipt", () => {
    const { openEditReceipt } = renderDetail();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(openEditReceipt).toHaveBeenCalledTimes(1);
  });

  it("Delete button calls handleDelete with invoice id", () => {
    const { handleDelete } = renderDetail();
    fireEvent.click(screen.getByRole("button", { name: /✕ delete/i }));
    expect(handleDelete).toHaveBeenCalledWith("1");
  });

  it("close button calls setSelected with null", () => {
    const { setSelected } = renderDetail();
    const closeBtn = document.querySelector(".close-btn");
    fireEvent.click(closeBtn);
    expect(setSelected).toHaveBeenCalledWith(null);
  });
});

describe("InvoiceDetail — invoice content", () => {
  it("status change buttons exclude current status", () => {
    renderDetail({ status: "draft" });
    // Should see sent, paid, voided — but NOT draft
    expect(screen.queryByRole("button", { name: /^draft$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sent$/i })).toBeInTheDocument();
  });

  it("notes section shows when invoice has notes", () => {
    renderDetail({ notes: "Pay within 14 days" });
    expect(screen.getByText("Pay within 14 days")).toBeInTheDocument();
  });

  it("notes section hidden when invoice has no notes", () => {
    renderDetail({ notes: "" });
    expect(screen.queryByText(/pay within/i)).not.toBeInTheDocument();
  });
});
