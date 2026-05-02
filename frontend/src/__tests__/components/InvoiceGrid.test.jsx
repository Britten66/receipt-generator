/*
  ══════════════════════════════════════════════════════════════════════════════
  COMPONENT TEST: InvoiceGrid
  File: components/InvoiceGrid.test.jsx
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  InvoiceGrid is the main dashboard view. Loading state, empty state, card
  rendering, selection highlighting, and delete wiring must all work correctly.
  A broken delete callback or missing selected class is invisible until a user
  reports it.

  WHAT WE VERIFY:
  ───────────────
  1.  Shows "Loading..." when loading=true
  2.  Shows "No invoices found" when filtered=[]
  3.  Renders correct number of invoice cards
  4.  Displays invoice number and customer name on each card
  5.  Selected card has "selected" class
  6.  Non-selected cards do not have "selected" class
  7.  Delete button click calls handleDelete with correct id
  8.  Card click calls selectFull with correct id
  ══════════════════════════════════════════════════════════════════════════════
*/

import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import InvoiceGrid from "../../features/invoices/InvoiceGrid";

describe("Dashboard", () => {

const MOCK_INVOICES = [
  { id: "1", receipt_number: "INV-000001", customer_name: "Alice", vendor_name: "My Biz", status: "draft", total: 100 },
  { id: "2", receipt_number: "INV-000002", customer_name: "Bob",   vendor_name: "My Biz", status: "sent",  total: 200 },
];

function renderGrid(overrides = {}) {
  const props = {
    loading: false,
    filtered: MOCK_INVOICES,
    selectedReceipt: null,
    swipedId: null,
    setSwipedId: vi.fn(),
    handleDelete: vi.fn(),
    selectFull: vi.fn(),
    ...overrides,
  };
  render(<InvoiceGrid {...props} />);
  return props;
}

describe("InvoiceGrid: states", () => {
  it("shows Loading... when loading=true", () => {
    renderGrid({ loading: true });
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows No invoices found when filtered is empty", () => {
    renderGrid({ filtered: [] });
    expect(screen.getByText("No invoices found")).toBeInTheDocument();
  });

  it("renders the correct number of cards", () => {
    renderGrid();
    expect(screen.getByText("INV-000001")).toBeInTheDocument();
    expect(screen.getByText("INV-000002")).toBeInTheDocument();
  });

  it("displays customer name on each card", () => {
    renderGrid();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});

describe("InvoiceGrid: selection", () => {
  it("selected card has 'selected' class", () => {
    renderGrid({ selectedReceipt: MOCK_INVOICES[0] });
    const cards = document.querySelectorAll(".receipt-card");
    expect(cards[0].classList.contains("selected")).toBe(true);
  });

  it("non-selected cards do not have 'selected' class", () => {
    renderGrid({ selectedReceipt: MOCK_INVOICES[0] });
    const cards = document.querySelectorAll(".receipt-card");
    expect(cards[1].classList.contains("selected")).toBe(false);
  });
});

describe("InvoiceGrid: interactions", () => {
  it("card click calls selectFull with correct id", () => {
    const { selectFull } = renderGrid();
    const cards = document.querySelectorAll(".receipt-card");
    fireEvent.click(cards[0]);
    expect(selectFull).toHaveBeenCalledWith("1");
  });

  it("delete button calls handleDelete with correct id", () => {
    const { handleDelete } = renderGrid();
    const deleteButtons = document.querySelectorAll(".card-delete");
    fireEvent.click(deleteButtons[0]);
    expect(handleDelete).toHaveBeenCalledWith("1");
  });
});


}); // Dashboard