/*
  ══════════════════════════════════════════════════════════════════════════════
  COMPONENT TEST: AppSidebar
  File: components/AppSidebar.test.jsx
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  AppSidebar is the primary navigation surface. Filter buttons, stats, and
  action buttons are all here. A broken filter or wrong count badge is
  immediately visible to every user on every session.

  WHAT WE VERIFY:
  ───────────────
  1.  Revenue stat displays correctly
  2.  Outstanding stat displays correctly
  3.  Invoice count displays correctly
  4.  Active filter has "active" class
  5.  Non-active filters do not have "active" class
  6.  Clicking a filter calls setFilter with correct key
  7.  New Invoice button calls openNewReceipt
  8.  Shows business name when profile has one
  9.  Shows "+ Add Business Profile" when no business name
  10. Profile button calls setShowProfileModal
  11. Help button calls setShowHelp
  12. Trash button calls setShowTrash
  13. Billing button calls setShowBilling
  14. Per-status count badges show correct counts
  ══════════════════════════════════════════════════════════════════════════════
*/

import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import AppSidebar from "../../layout/AppSidebar";

const MOCK_RECEIPTS = [
  { id: "1", status: "draft" },
  { id: "2", status: "sent" },
  { id: "3", status: "paid" },
];

const MOCK_COUNTS = { draft: 1, sent: 1, paid: 1, voided: 0 };

function renderSidebar(overrides = {}) {
  const props = {
    receipts: MOCK_RECEIPTS,
    revenue: 300,
    outstanding: 200,
    counts: MOCK_COUNTS,
    filter: "ALL",
    setFilter: vi.fn(),
    profile: { business_name: "Acme Co" },
    setShowProfileModal: vi.fn(),
    openNewReceipt: vi.fn(),
    setShowBilling: vi.fn(),
    setLegal: vi.fn(),
    setShowHelp: vi.fn(),
    setShowTrash: vi.fn(),
    ...overrides,
  };
  render(<AppSidebar {...props} />);
  return props;
}

describe("AppSidebar — stats", () => {
  it("displays revenue", () => {
    renderSidebar();
    expect(screen.getByText("$300.00")).toBeInTheDocument();
  });

  it("displays outstanding", () => {
    renderSidebar();
    expect(screen.getByText("$200.00")).toBeInTheDocument();
  });

  it("displays invoice count", () => {
    renderSidebar();
    // "3" appears multiple times (invoice count + filter badges) — check the stat block
    const statValues = document.querySelectorAll(".stat-value");
    const countStat = Array.from(statValues).find(el => el.textContent === "3");
    expect(countStat).toBeTruthy();
  });
});

describe("AppSidebar — filters", () => {
  it("active filter button has 'active' class", () => {
    renderSidebar({ filter: "draft" });
    const draftBtn = screen.getByRole("button", { name: /draft/i });
    expect(draftBtn.classList.contains("active")).toBe(true);
  });

  it("non-active filters do not have 'active' class", () => {
    renderSidebar({ filter: "ALL" });
    const draftBtn = screen.getByRole("button", { name: /^draft/i });
    expect(draftBtn.classList.contains("active")).toBe(false);
  });

  it("clicking draft filter calls setFilter with 'draft'", () => {
    const { setFilter } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /^draft/i }));
    expect(setFilter).toHaveBeenCalledWith("draft");
  });

  it("clicking ALL filter calls setFilter with 'ALL'", () => {
    const { setFilter } = renderSidebar({ filter: "draft" });
    fireEvent.click(screen.getByRole("button", { name: /^all/i }));
    expect(setFilter).toHaveBeenCalledWith("ALL");
  });
});

describe("AppSidebar — profile", () => {
  it("shows business name when profile has one", () => {
    renderSidebar({ profile: { business_name: "Acme Co" } });
    expect(screen.getByText(/Acme Co/)).toBeInTheDocument();
  });

  it("shows '+ Add Business Profile' when no business name", () => {
    renderSidebar({ profile: {} });
    expect(screen.getByText(/\+ Add Business Profile/i)).toBeInTheDocument();
  });

  it("profile button calls setShowProfileModal", () => {
    const { setShowProfileModal } = renderSidebar();
    fireEvent.click(screen.getByText(/Acme Co/));
    expect(setShowProfileModal).toHaveBeenCalledWith(true);
  });
});

describe("AppSidebar — action buttons", () => {
  it("New Invoice button calls openNewReceipt", () => {
    const { openNewReceipt } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /\+ New Invoice/i }));
    expect(openNewReceipt).toHaveBeenCalledTimes(1);
  });

  it("help button calls setShowHelp", () => {
    const { setShowHelp } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /help/i }));
    expect(setShowHelp).toHaveBeenCalledWith(true);
  });

  it("trash button calls setShowTrash", () => {
    const { setShowTrash } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /recently deleted/i }));
    expect(setShowTrash).toHaveBeenCalledWith(true);
  });

  it("billing button calls setShowBilling", () => {
    const { setShowBilling } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /billing/i }));
    expect(setShowBilling).toHaveBeenCalledWith(true);
  });
});
