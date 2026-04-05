import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapParsedToForm, clean } from "../api/aiParse";

// mapParsedToForm and clean are pure functions — no network, no auth needed.
// These tests run instantly and cover every real edge case.

describe("mapParsedToForm", () => {

  it("maps a single line item correctly", () => {
    const parsed = {
      vendor_name: "Acme Co",
      customer_name: "Bob",
      line_items: [{ description: "Web Design", quantity: 1, unit_price: 500 }],
    };
    const { fields, items } = mapParsedToForm(parsed);
    expect(fields.vendor_name).toBe("Acme Co");
    expect(fields.customer_name).toBe("Bob");
    expect(items).toHaveLength(1);
    expect(items[0].description).toBe("Web Design");
    expect(items[0].quantity).toBe("1");
    expect(items[0].unit_price).toBe("500");
    expect(items[0].total).toBe("500.00");
  });

  it("maps multiple line items into separate rows", () => {
    const parsed = {
      line_items: [
        { description: "Web Service", quantity: 1, unit_price: 300 },
        { description: "Paint Service", quantity: 1, unit_price: 200 },
      ],
    };
    const { items } = mapParsedToForm(parsed);
    expect(items).toHaveLength(2);
    expect(items[0].description).toBe("Web Service");
    expect(items[1].description).toBe("Paint Service");
  });

  it("calculates total correctly from quantity and unit_price", () => {
    const parsed = {
      line_items: [{ description: "Consulting", quantity: 3, unit_price: 85 }],
    };
    const { items } = mapParsedToForm(parsed);
    expect(items[0].total).toBe("255.00");
  });

  it("defaults quantity to 1 when missing or zero", () => {
    const parsed = {
      line_items: [{ description: "Logo Design", quantity: 0, unit_price: 400 }],
    };
    const { items } = mapParsedToForm(parsed);
    expect(items[0].quantity).toBe("1");
    expect(items[0].total).toBe("400.00");
  });

  it("defaults unit_price to 0 when missing", () => {
    const parsed = {
      line_items: [{ description: "Free consult", quantity: 1, unit_price: null }],
    };
    const { items } = mapParsedToForm(parsed);
    expect(items[0].unit_price).toBe("0");
    expect(items[0].total).toBe("0.00");
  });

  it("returns null items when line_items is empty", () => {
    const parsed = { vendor_name: "Acme", line_items: [] };
    const { items } = mapParsedToForm(parsed);
    expect(items).toBeNull();
  });

  it("returns null items when line_items is missing", () => {
    const parsed = { vendor_name: "Acme" };
    const { items } = mapParsedToForm(parsed);
    expect(items).toBeNull();
  });

  it("passes currency through to fields", () => {
    const parsed = { currency: "USD", line_items: [] };
    const { fields } = mapParsedToForm(parsed);
    expect(fields.currency).toBe("USD");
  });

  it("does not set currency when missing", () => {
    const parsed = { vendor_name: "Acme", line_items: [] };
    const { fields } = mapParsedToForm(parsed);
    expect(fields.currency).toBeUndefined();
  });

  it("passes notes through and shows notes section", () => {
    const parsed = { notes: "Due in 30 days", line_items: [] };
    const { fields } = mapParsedToForm(parsed);
    expect(fields.notes).toBe("Due in 30 days");
  });

  it("strips em dashes from descriptions", () => {
    const parsed = {
      line_items: [{ description: "Web\u2014Design", quantity: 1, unit_price: 100 }],
    };
    const { items } = mapParsedToForm(parsed);
    expect(items[0].description).toBe("Web-Design");
  });

  it("strips em dashes from vendor name", () => {
    const parsed = {
      vendor_name: "Acme\u2014Co",
      line_items: [],
    };
    const { fields } = mapParsedToForm(parsed);
    expect(fields.vendor_name).toBe("Acme-Co");
  });

  it("strips curly quotes from descriptions", () => {
    const parsed = {
      line_items: [{ description: "\u201Clogo\u201D design", quantity: 1, unit_price: 50 }],
    };
    const { items } = mapParsedToForm(parsed);
    expect(items[0].description).toBe('"logo" design');
  });

  it("handles string quantities from AI", () => {
    const parsed = {
      line_items: [{ description: "Hours", quantity: "3", unit_price: "85" }],
    };
    const { items } = mapParsedToForm(parsed);
    expect(items[0].quantity).toBe("3");
    expect(items[0].total).toBe("255.00");
  });

  it("handles null vendor and customer names gracefully", () => {
    const parsed = {
      vendor_name: null,
      customer_name: null,
      line_items: [],
    };
    const { fields } = mapParsedToForm(parsed);
    expect(fields.vendor_name).toBeUndefined();
    expect(fields.customer_name).toBeUndefined();
  });

  it("trims whitespace from fields", () => {
    const parsed = {
      vendor_name: "  Acme  ",
      line_items: [],
    };
    const { fields } = mapParsedToForm(parsed);
    expect(fields.vendor_name).toBe("Acme");
  });
});
