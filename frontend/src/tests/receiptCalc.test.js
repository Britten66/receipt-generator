import { describe, it, expect } from "vitest";

// Pure calculation logic extracted for testing.
// These mirror exactly what ReceiptForm does before submitting.

function calcLineTotal(quantity, unitPrice) {
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  return parseFloat((qty * price).toFixed(2));
}

function calcSubtotal(items) {
  return parseFloat(
    items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0).toFixed(2)
  );
}

function calcTax(subtotal, taxRate) {
  if (!taxRate || taxRate <= 0) return 0;
  return parseFloat((subtotal * (taxRate / 100)).toFixed(2));
}

function calcTotal(subtotal, tax) {
  return parseFloat((subtotal + tax).toFixed(2));
}

describe("Line item calculations", () => {
  it("multiplies qty by price correctly", () => {
    expect(calcLineTotal(3, 85)).toBe(255);
  });

  it("rounds to 2 decimal places", () => {
    expect(calcLineTotal(3, 33.333)).toBe(99.99);
  });

  it("returns 0 for empty quantity", () => {
    expect(calcLineTotal("", 100)).toBe(0);
  });

  it("returns 0 for empty price", () => {
    expect(calcLineTotal(1, "")).toBe(0);
  });

  it("handles string inputs from form state", () => {
    expect(calcLineTotal("2", "50")).toBe(100);
  });
});

describe("Subtotal calculation", () => {
  it("sums all line item totals", () => {
    const items = [
      { total: "100.00" },
      { total: "200.00" },
      { total: "50.00" },
    ];
    expect(calcSubtotal(items)).toBe(350);
  });

  it("handles empty items array", () => {
    expect(calcSubtotal([])).toBe(0);
  });

  it("ignores invalid total strings", () => {
    const items = [{ total: "100.00" }, { total: "" }];
    expect(calcSubtotal(items)).toBe(100);
  });
});

describe("Tax calculation", () => {
  it("calculates GST at 5%", () => {
    expect(calcTax(100, 5)).toBe(5);
  });

  it("calculates HST at 13%", () => {
    expect(calcTax(100, 13)).toBe(13);
  });

  it("calculates HST at 15%", () => {
    expect(calcTax(200, 15)).toBe(30);
  });

  it("returns 0 when tax rate is 0", () => {
    expect(calcTax(100, 0)).toBe(0);
  });

  it("returns 0 when tax rate is null", () => {
    expect(calcTax(100, null)).toBe(0);
  });

  it("rounds tax to 2 decimal places", () => {
    expect(calcTax(100, 14.975)).toBe(14.98);
  });
});

describe("Total calculation", () => {
  it("adds subtotal and tax", () => {
    expect(calcTotal(100, 13)).toBe(113);
  });

  it("handles zero tax", () => {
    expect(calcTotal(250, 0)).toBe(250);
  });

  it("rounds correctly", () => {
    expect(calcTotal(99.99, 14.99)).toBe(114.98);
  });
});
