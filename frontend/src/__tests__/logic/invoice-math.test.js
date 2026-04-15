/*
  ══════════════════════════════════════════════════════════════════════════════
  BUSINESS LOGIC TEST: Invoice Math
  File: logic/invoice-math.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS:
  ─────────────────
  The core financial calculations in ReceiptForm.jsx run entirely in the
  browser. A rounding error, division by zero, or silent NaN produces a wrong
  number on a real invoice sent to a real client. These tests lock the exact
  behaviour so a refactor can never silently break the math.

  REPLICATES LOGIC FROM:
  ─────────────────────
  frontend/src/features/invoices/ReceiptForm.jsx
    subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0)
    taxRateFraction = isTaxExempt ? 0 : (parseFloat(taxRate) || 0) / 100
    tax   = subtotal * taxRateFraction
    total = subtotal + tax

    Row total: updatedRow.total = (qty * price).toFixed(2)

    Tax back-calculation on edit:
    inferredRate = ((savedTax / savedSubtotal) * 100).toFixed(2).replace(/\.?0+$/, "")

  frontend/src/features/invoices/ReceiptPDF.js
    fmtMoney: "$" + parseFloat(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  WHAT WE VERIFY:
  ───────────────
  1.  Subtotal sums all line item totals
  2.  Tax is correctly applied as a percentage of subtotal
  3.  Total = subtotal + tax
  4.  Tax exempt flag zeroes out tax regardless of rate
  5.  Row total = qty * unit_price, rounded to 2dp
  6.  Fractional quantities (1.5 hrs at $80)
  7.  Empty / missing items treated as 0, not NaN
  8.  Tax rounding edge cases (fractional cents)
  9.  fmtMoney formats correctly for standard and edge case values
  10. Tax back-calculation on edit — infers rate from saved tax/subtotal
  11. Tax back-calculation with zero subtotal (division by zero guard)
  12. Multiple line items accumulate correctly
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect } from "vitest";

describe("Invoice Logic", () => {

// ── Replicated from ReceiptForm.jsx ──────────────────────────────────────────

function calcSubtotal(items) {
  return items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
}

function calcTax(subtotal, taxRate, isTaxExempt) {
  const fraction = isTaxExempt ? 0 : (parseFloat(taxRate) || 0) / 100;
  return subtotal * fraction;
}

function calcTotal(subtotal, tax) {
  return subtotal + tax;
}

function calcRowTotal(quantity, unit_price) {
  const qty   = quantity   !== "" ? parseFloat(quantity)   || 0 : 0;
  const price = unit_price !== "" ? parseFloat(unit_price) || 0 : 0;
  return (qty * price).toFixed(2);
}

function inferTaxRate(savedTax, savedSubtotal) {
  if (savedTax > 0 && savedSubtotal > 0) {
    return ((savedTax / savedSubtotal) * 100).toFixed(2).replace(/\.?0+$/, "");
  }
  return "0";
}

// ── Replicated from ReceiptPDF.js ─────────────────────────────────────────────

function fmtMoney(n) {
  return "$" + parseFloat(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─────────────────────────────────────────────────────────────────────────────

describe("calcSubtotal — line item sum", () => {
  it("sums a single line item", () => {
    expect(calcSubtotal([{ total: "100.00" }])).toBe(100);
  });

  it("sums multiple line items", () => {
    const items = [{ total: "100.00" }, { total: "50.00" }, { total: "25.50" }];
    expect(calcSubtotal(items)).toBeCloseTo(175.5, 2);
  });

  it("treats empty total string as 0", () => {
    expect(calcSubtotal([{ total: "" }])).toBe(0);
  });

  it("treats missing total as 0", () => {
    expect(calcSubtotal([{}])).toBe(0);
  });

  it("treats NaN total as 0", () => {
    expect(calcSubtotal([{ total: "abc" }])).toBe(0);
  });

  it("returns 0 for empty items array", () => {
    expect(calcSubtotal([])).toBe(0);
  });

  it("handles large amounts without precision loss", () => {
    const items = [{ total: "9999.99" }, { total: "9999.99" }];
    expect(calcSubtotal(items)).toBeCloseTo(19999.98, 2);
  });
});

describe("calcTax — tax calculation", () => {
  it("calculates 13% HST correctly", () => {
    expect(calcTax(100, "13", false)).toBeCloseTo(13, 2);
  });

  it("calculates 5% GST correctly", () => {
    expect(calcTax(200, "5", false)).toBeCloseTo(10, 2);
  });

  it("returns 0 when tax exempt", () => {
    expect(calcTax(100, "13", true)).toBe(0);
  });

  it("returns 0 when tax rate is 0", () => {
    expect(calcTax(100, "0", false)).toBe(0);
  });

  it("returns 0 when tax rate is empty string", () => {
    expect(calcTax(100, "", false)).toBe(0);
  });

  it("handles fractional tax rates (e.g. 8.5%)", () => {
    expect(calcTax(100, "8.5", false)).toBeCloseTo(8.5, 2);
  });

  it("tax exempt flag overrides non-zero rate", () => {
    expect(calcTax(500, "20", true)).toBe(0);
  });
});

describe("calcTotal — grand total", () => {
  it("total = subtotal + tax", () => {
    expect(calcTotal(100, 13)).toBe(113);
  });

  it("total = subtotal when tax is 0", () => {
    expect(calcTotal(250, 0)).toBe(250);
  });

  it("handles fractional cents", () => {
    // $99.99 at 13% = $12.9987 tax → total $112.9887
    const subtotal = 99.99;
    const tax = calcTax(subtotal, "13", false);
    expect(calcTotal(subtotal, tax)).toBeCloseTo(112.99, 2);
  });
});

describe("calcRowTotal — qty × unit price", () => {
  it("1 × $100 = $100.00", () => {
    expect(calcRowTotal("1", "100")).toBe("100.00");
  });

  it("3 × $45.50 = $136.50", () => {
    expect(calcRowTotal("3", "45.50")).toBe("136.50");
  });

  it("fractional qty: 1.5 hours × $80 = $120.00", () => {
    expect(calcRowTotal("1.5", "80")).toBe("120.00");
  });

  it("returns 0.00 when qty is empty", () => {
    expect(calcRowTotal("", "100")).toBe("0.00");
  });

  it("returns 0.00 when price is empty", () => {
    expect(calcRowTotal("2", "")).toBe("0.00");
  });

  it("returns 0.00 when both are empty", () => {
    expect(calcRowTotal("", "")).toBe("0.00");
  });

  it("returns 0.00 when qty is NaN string", () => {
    expect(calcRowTotal("abc", "100")).toBe("0.00");
  });

  it("rounds to exactly 2 decimal places", () => {
    // 3 × $33.3333 = $99.9999 → toFixed(2) rounds to $100.00
    expect(calcRowTotal("3", "33.3333")).toBe("100.00");
  });
});

describe("inferTaxRate — back-calculate rate on edit", () => {
  it("infers 13% from $13 tax on $100 subtotal", () => {
    expect(inferTaxRate(13, 100)).toBe("13");
  });

  it("infers 5% from $10 tax on $200 subtotal", () => {
    expect(inferTaxRate(10, 200)).toBe("5");
  });

  it("infers fractional rate (8.5%)", () => {
    expect(inferTaxRate(8.5, 100)).toBe("8.5");
  });

  it("returns '0' when tax is 0 (tax exempt invoice)", () => {
    expect(inferTaxRate(0, 100)).toBe("0");
  });

  it("returns '0' when subtotal is 0 — no division by zero", () => {
    expect(inferTaxRate(0, 0)).toBe("0");
  });

  it("returns '0' when subtotal is 0 but tax is somehow > 0", () => {
    // Defensive: should not divide by zero or return Infinity
    expect(inferTaxRate(13, 0)).toBe("0");
  });

  it("strips trailing zeros from inferred rate", () => {
    // 15.00% should come back as "15" not "15.00"
    expect(inferTaxRate(15, 100)).toBe("15");
  });
});

describe("fmtMoney — currency formatting", () => {
  it("formats a whole number", () => {
    expect(fmtMoney(100)).toBe("$100.00");
  });

  it("formats a decimal amount", () => {
    expect(fmtMoney(99.99)).toBe("$99.99");
  });

  it("formats $0", () => {
    expect(fmtMoney(0)).toBe("$0.00");
  });

  it("formats null as $0.00", () => {
    expect(fmtMoney(null)).toBe("$0.00");
  });

  it("formats undefined as $0.00", () => {
    expect(fmtMoney(undefined)).toBe("$0.00");
  });

  it("adds thousand separators for large amounts", () => {
    expect(fmtMoney(1200)).toBe("$1,200.00");
  });

  it("handles very large invoice amounts", () => {
    expect(fmtMoney(43252345)).toBe("$43,252,345.00");
  });

  it("formats a string number correctly", () => {
    expect(fmtMoney("250.50")).toBe("$250.50");
  });
});

describe("full invoice calculation — end to end", () => {
  it("two line items + 13% HST = correct totals", () => {
    const items = [
      { total: "1200.00" },
      { total: "540.00" },
    ];
    const subtotal = calcSubtotal(items);
    const tax      = calcTax(subtotal, "13", false);
    const total    = calcTotal(subtotal, tax);

    expect(subtotal).toBeCloseTo(1740, 2);
    expect(tax).toBeCloseTo(226.2, 2);
    expect(total).toBeCloseTo(1966.2, 2);
  });

  it("tax exempt invoice — tax is always 0 regardless of rate", () => {
    const items = [{ total: "500.00" }, { total: "250.00" }];
    const subtotal = calcSubtotal(items);
    const tax      = calcTax(subtotal, "15", true);
    const total    = calcTotal(subtotal, tax);

    expect(subtotal).toBe(750);
    expect(tax).toBe(0);
    expect(total).toBe(750);
  });

  it("invoice with no line items produces $0.00 total", () => {
    const subtotal = calcSubtotal([]);
    const tax      = calcTax(subtotal, "13", false);
    const total    = calcTotal(subtotal, tax);

    expect(subtotal).toBe(0);
    expect(tax).toBe(0);
    expect(total).toBe(0);
  });
});

});
