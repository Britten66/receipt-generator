import { describe, it, expect } from "vitest";

// Input validation rules — mirrors what the edge functions enforce
// and what the form should catch before sending.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAYMENT_URL_RE = /^https?:\/\//i;

function validateEmail(email) {
  if (!email) return "Email is required";
  if (!EMAIL_RE.test(email)) return "Invalid email address";
  return null;
}

function validatePaymentUrl(url) {
  if (!url) return null; // optional field
  if (!PAYMENT_URL_RE.test(url)) return "Payment URL must start with http:// or https://";
  return null;
}

function validateInvoiceFields({ vendor_name, customer_name }) {
  const errors = [];
  if (!vendor_name?.trim()) errors.push("Vendor name is required");
  if (!customer_name?.trim()) errors.push("Customer name is required");
  return errors;
}

describe("Email validation", () => {
  it("accepts valid email", () => {
    expect(validateEmail("test@example.com")).toBeNull();
  });

  it("rejects missing email", () => {
    expect(validateEmail("")).toBe("Email is required");
  });

  it("rejects email without @", () => {
    expect(validateEmail("notanemail")).toBe("Invalid email address");
  });

  it("rejects email without domain", () => {
    expect(validateEmail("test@")).toBe("Invalid email address");
  });

  it("rejects email without TLD", () => {
    expect(validateEmail("test@domain")).toBe("Invalid email address");
  });

  it("accepts email with subdomain", () => {
    expect(validateEmail("user@mail.example.com")).toBeNull();
  });

  it("accepts email with plus addressing", () => {
    expect(validateEmail("user+tag@example.com")).toBeNull();
  });
});

describe("Payment URL validation", () => {
  it("accepts https URL", () => {
    expect(validatePaymentUrl("https://buy.stripe.com/abc123")).toBeNull();
  });

  it("accepts http URL", () => {
    expect(validatePaymentUrl("http://paypal.me/user")).toBeNull();
  });

  it("rejects URL without protocol", () => {
    expect(validatePaymentUrl("stripe.com/pay")).not.toBeNull();
  });

  it("allows empty URL since field is optional", () => {
    expect(validatePaymentUrl("")).toBeNull();
    expect(validatePaymentUrl(null)).toBeNull();
  });
});

describe("Invoice field validation", () => {
  it("passes with both names present", () => {
    expect(validateInvoiceFields({ vendor_name: "Acme", customer_name: "Bob" })).toHaveLength(0);
  });

  it("fails with missing vendor name", () => {
    const errors = validateInvoiceFields({ vendor_name: "", customer_name: "Bob" });
    expect(errors).toContain("Vendor name is required");
  });

  it("fails with missing customer name", () => {
    const errors = validateInvoiceFields({ vendor_name: "Acme", customer_name: "" });
    expect(errors).toContain("Customer name is required");
  });

  it("fails with whitespace-only vendor name", () => {
    const errors = validateInvoiceFields({ vendor_name: "   ", customer_name: "Bob" });
    expect(errors).toContain("Vendor name is required");
  });

  it("fails with both names missing", () => {
    const errors = validateInvoiceFields({ vendor_name: "", customer_name: "" });
    expect(errors).toHaveLength(2);
  });
});
